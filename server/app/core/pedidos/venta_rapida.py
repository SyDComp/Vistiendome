"""
Venta rápida en el local: alguien entra, elige, paga y se lleva la prenda.

No es un sistema aparte: es un pedido que recorre todo el ciclo de una vez,
con las mismas reglas de siempre. Así la bodega, la historia y el informe de
ventas lo ven igual que cualquier otro:

  1. se crea (canal "En la tienda", retiro), con la clienta o sin datos;
  2. se registran los pagos, que tienen que sumar el total;
  3. se confirma: todo sale de bodega, y tiene que haber;
  4. se entrega.

Si algo falla, no queda nada: quien llama guarda todo junto o nada.

Solo se vende lo que hay. Lo que hay que hacer o esperar es un pedido normal.
Decisiones del usuario 2026-10-13: venta sin datos (sin clienta, no se inventa
una), pago dividido, piezas únicas, y el precio se puede cambiar por prenda.
"""

from dataclasses import dataclass, field
from types import SimpleNamespace
from typing import List, Optional

from sqlmodel import Session

from ...models.catalog import SKU
from ...models.crm import Cotizacion, EstadoCotizacion, ModoEntrega, OrigenCotizacion
from ...models.historia import TipoEvento
from ...models.piezas import EstadoPieza, PiezaUnica
from .. import pagos, piezas
from . import ciclo, fecha
from .creacion import crear_pedido
from .historia import Actor, anotar
from .prendas import activas

# Cómo llegó: al local. Es el sentido mismo de esta venta.
CANAL_LOCAL = "En la tienda"
# El nombre del pedido cuando la clienta no da datos.
SIN_DATOS = "Venta en el local"


class NoSeVende(Exception):
    """El mensaje dice por qué, en palabras de la tienda."""


@dataclass
class PrendaVenta:
    sku_id: Optional[int] = None
    pieza_id: Optional[str] = None
    cantidad: int = 1
    precio: Optional[float] = None
    sin_costo: bool = False


@dataclass
class PagoVenta:
    monto: int
    medio: str
    nota: Optional[str] = None


@dataclass
class Clienta:
    persona_id: Optional[str] = None
    rut: Optional[str] = None
    nombres: str = ""
    apellidos: str = ""
    telefono: Optional[str] = None


def _datos(clienta: Optional[Clienta], prendas: List[PrendaVenta]):
    """Lo que crear_pedido espera (los campos de CotizacionCreate)."""
    c = clienta or Clienta(nombres=SIN_DATOS)
    return SimpleNamespace(
        persona_id=c.persona_id, rut=c.rut, nombres=c.nombres, apellidos=c.apellidos,
        email_personal=None, telefono=c.telefono,
        origen=OrigenCotizacion.MANUAL, mensaje=None, tipo_grupo=None, cantidad_aprox=None, fecha_evento=None,
        modo_entrega=ModoEntrega.RETIRO, transporte=None, tipo_despacho=None,
        region=None, comuna=None, comuna_id=None, direccion=None,
        items=[
            SimpleNamespace(sku_id=p.sku_id, producto_id=None, cantidad=p.cantidad,
                            precio_unitario_estimado=p.precio, sin_costo=p.sin_costo,
                            nombre_custom=None, config_custom=None, config_propuesta=None)
            for p in prendas if p.sku_id
        ],
    )


def _validar(db: Session, prendas: List[PrendaVenta]) -> None:
    if not prendas:
        raise NoSeVende("Agrega al menos una prenda.")
    for p in prendas:
        if bool(p.sku_id) == bool(p.pieza_id):
            raise NoSeVende("Cada prenda es una variante del catálogo o una pieza única.")
        if p.cantidad < 1:
            raise NoSeVende("La cantidad tiene que ser 1 o más.")
        if not p.sin_costo and not (p.precio and p.precio > 0):
            raise NoSeVende("Cada prenda necesita su precio (o marcarla sin costo).")
        if p.sku_id:
            sku = db.get(SKU, p.sku_id)
            if sku is None or sku.is_deleted:
                raise NoSeVende("Una de las prendas ya no está en el catálogo.")
        else:
            pieza = db.get(PiezaUnica, p.pieza_id)
            if pieza is None or EstadoPieza(pieza.estado) != EstadoPieza.DISPONIBLE:
                raise NoSeVende("Una de las piezas únicas ya no está disponible.")
            if p.cantidad != 1:
                raise NoSeVende("Una pieza única es una sola.")


def vender(db: Session, clienta: Optional[Clienta], prendas: List[PrendaVenta],
           pagos_venta: List[PagoVenta], actor: Actor) -> Cotizacion:
    """
    La venta completa: crea, cobra, confirma y entrega. `clienta` None: sin
    datos. No hace commit: si algo falla, quien llama deshace todo.
    """
    _validar(db, prendas)

    cotizacion = crear_pedido(db, _datos(clienta, prendas), actor, canal=CANAL_LOCAL,
                              permitir_sin_costo=True, sin_clienta=clienta is None)
    for p in prendas:
        if p.pieza_id:
            piezas.asignar(db, db.get(PiezaUnica, p.pieza_id), cotizacion, p.precio, p.sin_costo, actor)
    db.flush()
    db.refresh(cotizacion)

    # Se paga completo, en el momento: uno o más pagos que suman el total.
    total, _ = pagos.total_de(cotizacion)
    suma = sum(p.monto for p in pagos_venta)
    if suma != total:
        raise NoSeVende(f"Los pagos suman {pagos.pesos(suma)} y el total es {pagos.pesos(total)}.")
    for p in pagos_venta:
        try:
            pagos.registrar(db, cotizacion, p.monto, p.medio, p.nota, actor)
        except pagos.NoSeRegistra as e:
            raise NoSeVende(str(e))
    db.flush()

    # Todo sale de bodega, y tiene que haber: nada queda esperando.
    try:
        ciclo.confirmar(db, cotizacion, {it.id: ciclo.BODEGA for it in activas(cotizacion)}, None, set(),
                        actor, fecha=fecha.hoy())
    except ciclo.CambioLaBodega as e:
        faltan = [p.nombre for p in e.propuesta if p.queda == ciclo.ESPERANDO]
        raise NoSeVende(f"No hay suficiente en bodega de: {', '.join(faltan)}. Eso es un pedido normal, no una venta rápida.")
    except ciclo.NoSeConfirma as e:
        raise NoSeVende(str(e))
    db.flush()

    # Y se entrega.
    try:
        ciclo.sacar(db, cotizacion)
    except ciclo.NoSeDespacha as e:
        raise NoSeVende(str(e))
    ciclo.al_cambiar(cotizacion, EstadoCotizacion.DESPACHADA)
    cotizacion.estado = EstadoCotizacion.DESPACHADA
    db.add(cotizacion)
    anotar(db, cotizacion, TipoEvento.ESTADO, actor, de=EstadoCotizacion.CONFIRMADA.value,
           a=EstadoCotizacion.DESPACHADA.value, motivo="venta_local")
    return cotizacion
