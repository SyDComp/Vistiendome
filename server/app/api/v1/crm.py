from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlmodel import Session, select, func
from typing import List, Literal, Optional
from datetime import datetime
from pydantic import BaseModel, Field, field_validator

from app.database import get_session
from app.models.crm import Cotizacion, CotizacionItem, EstadoCotizacion, OrigenCotizacion, TipoDespacho, ModoEntrega
from app.models.iam import Persona, TipoPersona, Direccion, CuentaAcceso
from app.models.catalog import StockMovement, MovementType, SKU
from app.models.taller import OrdenCorte, OrdenCorteItem, EstadoOrdenCorte
from app.api.deps import get_current_user, RequirePermiso
from app.core import existencias as existencias_core
from app.core import movimientos as movimientos_core
from app.core import pedidos as pedidos_core
from app.core.pedidos import historia
from app.models.historia import TipoEvento
from app.core.limites import VentanaDeslizante
from app.models.propuestas import OpcionPropuesta

router = APIRouter()

class PersonaCreate(BaseModel):
    rut: str
    nombres: str
    apellidos: str
    email_personal: Optional[str] = None
    telefono: Optional[str] = None
    tipo_persona: TipoPersona = TipoPersona.CLIENTE
    transporte_preferido: Optional[str] = None
    direccion: Optional[str] = None
    comuna_id: Optional[int] = None

class PersonaRead(BaseModel):
    id: str
    rut: Optional[str] = None
    nombres: str
    apellidos: str
    email_personal: Optional[str] = None
    telefono: Optional[str] = None
    tipo_persona: TipoPersona
    estado: str
    transporte_preferido: Optional[str] = None
    direccion: Optional[str] = None
    comuna_id: Optional[int] = None
    comuna_nombre: Optional[str] = None
    region_id: Optional[int] = None
    region_nombre: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

def _get_persona_read(persona: Persona) -> PersonaRead:
    p_dict = persona.dict()
    if persona.direcciones and len(persona.direcciones) > 0:
        dir_obj = persona.direcciones[0]
        p_dict["direccion"] = dir_obj.calle_y_numero
        p_dict["comuna_id"] = dir_obj.comuna_id
        if dir_obj.comuna:
            p_dict["comuna_nombre"] = dir_obj.comuna.nombre
            p_dict["region_id"] = dir_obj.comuna.region_id
            if dir_obj.comuna.region:
                p_dict["region_nombre"] = dir_obj.comuna.region.nombre
    return PersonaRead(**p_dict)

class CotizacionItemRead(BaseModel):
    id: str
    sku_id: Optional[int] = None
    cantidad: int
    precio_unitario_estimado: float
    sku_name: Optional[str] = None
    sku_code: Optional[str] = None
    sku_image: Optional[str] = None
    # Producto y config crudos (no aplanados en sku_name), para armar la
    # planilla/orden de corte con columnas propias por característica.
    producto_nombre: Optional[str] = None
    config: dict = {}
    # Que caracteristicas llevan un valor propuesto por el cliente. La pantalla
    # las marca para que no se confundan con las del catalogo.
    config_propuesta: dict = {}
    cortado: bool = False

class OrdenDeCorteDelPedido(BaseModel):
    """Lo justo para nombrarla y poder saltar a ella."""
    id: str
    numero: int
    estado: EstadoOrdenCorte


class ProduccionRead(BaseModel):
    """
    En qué va la confección de este pedido. **Todo derivado**, nada declarado.

    Por eso no existe un estado "en corte" en el pedido: el sistema ya sabe
    pieza por pieza si está cortada (lo pone la orden de corte al finalizar), y
    pedir que además alguien lo declare abre la puerta a que las dos versiones
    no coincidan.
    """
    piezas: int = 0          # ítems con variante real: sólo eso se puede cortar
    cortadas: int = 0
    ordenes: List[OrdenDeCorteDelPedido] = []


class CotizacionRead(BaseModel):
    id: str
    numero: Optional[int] = None
    persona_id: str
    origen: OrigenCotizacion
    estado: EstadoCotizacion
    canal: Optional[str] = None
    mensaje: Optional[str] = None
    tipo_grupo: Optional[str] = None
    cantidad_aprox: Optional[int] = None
    fecha_evento: Optional[str] = None
    modo_entrega: Optional[ModoEntrega] = None
    transporte: Optional[str] = None
    tipo_despacho: Optional[TipoDespacho] = None
    region: Optional[str] = None
    comuna: Optional[str] = None
    direccion: Optional[str] = None
    # El nombre tal cual se escribio en este pedido. Ver el comentario en el
    # modelo (Cotizacion.nombre_contacto): puede diferir de `cliente.nombres`
    # a proposito, y es el que hay que mostrar.
    nombre_contacto: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    cliente: Optional[PersonaRead] = None
    items: List[CotizacionItemRead] = []
    produccion: ProduccionRead = ProduccionRead()

    class Config:
        from_attributes = True

def _get_item_read(it: CotizacionItem) -> CotizacionItemRead:
    it_dict = it.dict()
    # Siempre un dict: el modelo lo trae en None cuando la pieza viene del
    # catalogo, y el schema espera un diccionario. Sin esto reventaba la
    # lista COMPLETA de cotizaciones, no solo las personalizadas.
    it_dict["config_propuesta"] = it.config_propuesta or {}
    if it.sku and it.sku.product:
        variant_str = ""
        if isinstance(it.sku.config, dict) and len(it.sku.config) > 0:
            # Ignorar claves vacías o redundantes
            vals = [f"{v}" for k, v in it.sku.config.items() if v]
            if vals:
                variant_str = " - " + " / ".join(vals)
        elif it.sku.sku:
            variant_str = f" ({it.sku.sku})"

        it_dict["sku_name"] = it.nombre_custom or f"{it.sku.product.name}{variant_str}".strip()
        it_dict["sku_code"] = it.sku.sku
        # Product no tiene "featured_image" (bug preexistente: esto rompía en
        # 500 CUALQUIER cotización con un ítem de SKU real, incluida la lista
        # completa de GET /crm/). La imagen del producto vive en media_assets;
        # si el SKU tiene foto propia, es más precisa que la de portada.
        propia = it.sku.media_assets[0].url if it.sku.media_assets else None
        portada = it.sku.product.media_assets[0].url if it.sku.product.media_assets else None
        it_dict["sku_image"] = propia or portada
        it_dict["producto_nombre"] = it.sku.product.name
        it_dict["config"] = it.sku.config or {}
    else:
        it_dict["sku_name"] = it.nombre_custom or "Producto del Catálogo / Especial"
        it_dict["sku_code"] = "SKU-CUSTOM"
        it_dict["producto_nombre"] = it.nombre_custom or "Especial"
        # Sus caracteristicas van en el mismo campo que las de una variante del
        # catalogo: la planilla y la orden de corte las pintan igual, sin tener
        # que saber de donde salio la pieza.
        it_dict["config"] = it.config_custom or {}
    return CotizacionItemRead(**it_dict)

def _mapa_ordenes_de_corte(session: Session, cotizacion_ids: List[str]) -> dict:
    """
    `{cotizacion_id: [orden, ...]}` en UNA consulta.

    En un bucle por cotización serían N consultas; hoy son 14 pedidos y no se
    notaría, pero el listado crece con el negocio y esto no cuesta más escribirlo.
    Se excluyen las canceladas: una orden cancelada no dice nada de la pieza.
    """
    if not cotizacion_ids:
        return {}

    filas = session.exec(
        select(CotizacionItem.cotizacion_id, OrdenCorte)
        .join(OrdenCorteItem, OrdenCorteItem.cotizacion_item_id == CotizacionItem.id)
        .join(OrdenCorte, OrdenCorte.id == OrdenCorteItem.orden_id)
        .where(CotizacionItem.cotizacion_id.in_(cotizacion_ids))
        .where(OrdenCorte.estado != EstadoOrdenCorte.CANCELADA)
    ).all()

    mapa: dict = {}
    for cot_id, orden in filas:
        vistas = mapa.setdefault(cot_id, {})
        vistas[orden.id] = OrdenDeCorteDelPedido(
            id=orden.id, numero=orden.numero, estado=orden.estado
        )
    return {k: list(v.values()) for k, v in mapa.items()}


def _get_cotizacion_read(c: Cotizacion, ordenes: Optional[List[OrdenDeCorteDelPedido]] = None) -> CotizacionRead:
    c_dict = c.dict()
    if c.persona:
        c_dict["cliente"] = _get_persona_read(c.persona)
    items = list(c.items or [])
    c_dict["items"] = [_get_item_read(it) for it in items]
    # Sólo cuentan las piezas con variante real: un ítem escrito a mano no se
    # puede cortar, y sumarlo al total daría un "2 de 3" que nunca llega a 3.
    cortables = [it for it in items if it.sku_id]
    c_dict["produccion"] = ProduccionRead(
        piezas=len(cortables),
        cortadas=sum(1 for it in cortables if it.cortado),
        ordenes=ordenes or [],
    )
    return CotizacionRead(**c_dict)

class CotizacionItemCreate(BaseModel):
    sku_id: Optional[int] = None
    cantidad: int = 1
    precio_unitario_estimado: float = 0.0
    nombre_custom: Optional[str] = None
    # Caracteristicas de una pieza que no esta en el catalogo, para que se
    # pueda cortar igual que las demas. Mismo formato que SKU.config.
    config_custom: Optional[dict] = None
    # Cuales de esos valores no existen en el catalogo y los propuso el cliente.
    config_propuesta: Optional[dict] = None

class CotizacionCreate(BaseModel):
    """
    Los largos son los de las columnas, para que un texto de más devuelva 422
    —un error claro— y no 500.

    No es cosmético: este endpoint se llama desde la tienda sin esperar
    respuesta, así que un 500 significa un pedido perdido y nadie enterándose.
    Pasó con un RUT de más (H17). El formulario ya valida, pero el servidor no
    puede confiar en que el único que lo llama sea ese formulario.
    """

    persona_id: Optional[str] = None
    rut: Optional[str] = Field(default=None, max_length=12)
    nombres: Optional[str] = Field(default="", max_length=100)
    apellidos: Optional[str] = Field(default="", max_length=100)
    email_personal: Optional[str] = Field(default=None, max_length=255)
    telefono: Optional[str] = Field(default=None, max_length=20)
    
    origen: OrigenCotizacion = OrigenCotizacion.CATALOGO
    # "¿Cómo llegó?". Solo lo usa la ruta del panel; la tienda no lo manda.
    canal: Optional[str] = Field(default=None, max_length=60)
    mensaje: Optional[str] = None
    tipo_grupo: Optional[str] = None
    cantidad_aprox: Optional[int] = None
    fecha_evento: Optional[str] = None
    
    # Retiro o despacho. Se acepta None por compatibilidad con lo que ya
    # existía; el servidor lo completa abajo.
    modo_entrega: Optional[ModoEntrega] = None
    transporte: Optional[str] = Field(default=None, max_length=100)
    tipo_despacho: Optional[TipoDespacho] = None
    region: Optional[str] = Field(default=None, max_length=100)
    comuna: Optional[str] = Field(default=None, max_length=100)
    comuna_id: Optional[int] = None

    @field_validator("comuna_id", mode="before")
    @classmethod
    def _comuna_vacia_es_nula(cls, v):
        """
        Un formulario que no llenó la comuna manda "", no null, y eso no parsea
        como entero: el pedido moría con 422.

        Pasaba en TODO pedido de retiro hecho desde la web —no hay comuna que
        elegir— y no se veía, porque el registro en CRM se dispara sin esperar
        respuesta. El resultado: la clienta mandaba su pedido por WhatsApp y el
        pedido nunca entraba al sistema.
        """
        return None if v in ("", None) else v
    direccion: Optional[str] = Field(default=None, max_length=255)
    
    items: List[CotizacionItemCreate] = []

class PedidoRecibido(BaseModel):
    """
    Lo único que la tienda recibe de vuelta: el número de su pedido.

    Antes devolvía el pedido entero con los datos de la clienta, y bastaba
    mandar un pedido con el RUT de otra persona para recibir su nombre, correo,
    teléfono y dirección. La tienda no usa nada de eso.
    """
    numero: Optional[int] = None


# Un pedido real se manda una vez; un script, cientos. 20 cada 10 minutos por
# IP no frena a nadie que esté comprando, y sí a quien llena el panel de basura.
# La IP es la del visitante: el proxy la pasa y uvicorn corre con
# --proxy-headers.
_LIMITE_PEDIDOS = VentanaDeslizante(maximo=20, ventana_seg=600)

_ORIGENES_PUBLICOS = {
    OrigenCotizacion.CATALOGO,
    OrigenCotizacion.CONTACTO_INDIVIDUAL,
    OrigenCotizacion.CONTACTO_GRUPAL,
}


@router.post("/", response_model=PedidoRecibido)
def crear_cotizacion(data: CotizacionCreate, request: Request, session: Session = Depends(get_session)):
    """
    Pedido que llega de la tienda o del formulario de contacto, sin sesión.

    No puede crear un pedido "manual" —esos se cargan en el panel, y quién los
    cargó tiene que ser cierto— ni elegir a la persona por id.
    """
    if data.origen not in _ORIGENES_PUBLICOS or data.persona_id:
        raise HTTPException(status_code=403, detail="Los pedidos manuales se crean desde el panel.")
    if not _LIMITE_PEDIDOS.permite(request.client.host if request.client else "?"):
        raise HTTPException(status_code=429, detail="Demasiados pedidos seguidos. Espera unos minutos.")
    cotizacion = pedidos_core.crear_pedido(session, data, historia.SITIO_WEB)
    return PedidoRecibido(numero=cotizacion.numero)


@router.post("/cotizaciones", response_model=CotizacionRead)
def crear_cotizacion_manual(
    data: CotizacionCreate,
    session: Session = Depends(get_session),
    current_admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR")),
):
    """Pedido cargado en el panel. Siempre es manual: lo carga alguien con sesión."""
    canal = (data.canal or "").strip()
    if not canal:
        raise HTTPException(status_code=422, detail="Falta indicar cómo llegó el pedido.")
    data.origen = OrigenCotizacion.MANUAL
    cotizacion = pedidos_core.crear_pedido(session, data, historia.de_cuenta(current_admin), canal=canal)
    return _get_cotizacion_read(cotizacion)

@router.get("/conteo-estados")
def conteo_por_estado(session: Session = Depends(get_session), current_admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))):
    """
    Cuántos pedidos hay en cada estado. Una consulta, sin traer las filas.

    Existe para que una pantalla pueda decir "Por despachar (2)" sin cargar
    todos los pedidos sólo para contarlos.
    """
    filas = session.exec(
        select(Cotizacion.estado, func.count()).group_by(Cotizacion.estado)
    ).all()
    return {str(estado.value if hasattr(estado, "value") else estado): n for estado, n in filas}


@router.get("/", response_model=List[CotizacionRead])
def listar_cotizaciones(
    session: Session = Depends(get_session),
    skip: int = 0,
    limit: int = 100,
    estado: Optional[List[EstadoCotizacion]] = Query(default=None),
    current_admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR")),
):
    """
    `?estado=CONFIRMADA&estado=DESPACHADA` acota la lista en el servidor.

    Importa para pantallas como la de etiquetas: traer todo y filtrar en el
    navegador funciona con 14 pedidos y deja de funcionar en el 101, porque el
    `limit` corta antes de que el filtro llegue a mirar.
    """
    consulta = select(Cotizacion)
    if estado:
        consulta = consulta.where(Cotizacion.estado.in_(estado))
    cotizaciones = session.exec(
        consulta.order_by(Cotizacion.created_at.desc()).offset(skip).limit(limit)
    ).all()
    ordenes = _mapa_ordenes_de_corte(session, [c.id for c in cotizaciones])
    return [_get_cotizacion_read(c, ordenes.get(c.id, [])) for c in cotizaciones]

def _sincronizar_stock_venta(session: Session, cotizacion: Cotizacion, estado_anterior: EstadoCotizacion, estado_nuevo: EstadoCotizacion) -> None:
    """
    Al pasar a DESPACHADA descuenta el stock de cada prenda con SKU real; al
    salir de DESPACHADA lo devuelve.

    Nada se borra: devolver es otro movimiento, y lo que movió cada prenda es
    la suma de lo anotado con su `reference_id` (ver core/movimientos.py).
    Despachar, deshacer y volver a despachar queda escrito tal cual pasó, y
    nunca descuenta dos veces.
    """
    entra_a_despacho = estado_nuevo == EstadoCotizacion.DESPACHADA and estado_anterior != EstadoCotizacion.DESPACHADA
    sale_de_despacho = estado_anterior == EstadoCotizacion.DESPACHADA and estado_nuevo != EstadoCotizacion.DESPACHADA

    if not entra_a_despacho and not sale_de_despacho:
        return

    prendas = [item for item in cotizacion.items if item.sku_id]

    # NO SE DESPACHA LO QUE NO HAY
    # Se comprueba TODO el pedido antes de tocar nada, y se avisa de una vez de
    # todo lo que falta: quien despacha no tiene por que descubrirlo de a uno.
    # Lo que este mismo pedido ya tiene descontado no cuenta como faltante.
    if entra_a_despacho:
        ya_movido = movimientos_core.netos_de(session, [i.id for i in prendas])
        por_sacar = {}
        for item in prendas:
            falta = item.cantidad + ya_movido.get(item.id, 0)  # el neto es negativo
            if falta > 0:
                por_sacar[item.sku_id] = por_sacar.get(item.sku_id, 0) + falta
        problemas = existencias_core.faltantes(session, por_sacar)
        if problemas:
            detalle = []
            for sku_id, hay, pide in problemas:
                sku = session.get(SKU, sku_id)
                nombre = sku.sku if sku else f"SKU {sku_id}"
                detalle.append(f"{nombre}: hay {hay}, se necesitan {pide}")
            raise HTTPException(
                status_code=409,
                detail=(
                    "No se puede despachar: no hay existencia suficiente. "
                    + " · ".join(detalle)
                    + ". Registra la entrada (orden de corte o ajuste) y vuelve a intentarlo."
                ),
            )

    for item in prendas:
        movimientos_core.llevar_a(
            session,
            sku_id=item.sku_id,
            reference_id=item.id,
            objetivo=-item.cantidad if entra_a_despacho else 0,
            tipo_si_resta=MovementType.SALE,
            tipo_si_suma=MovementType.RETURN,
            nota=(f"Despacho pedido #{cotizacion.numero}" if entra_a_despacho
                  else f"Se deshizo el despacho del pedido #{cotizacion.numero}"),
        )


class EstadoUpdate(BaseModel):
    estado: EstadoCotizacion
    # De dónde vino el cambio, si no fue a mano. Hoy imprimir etiquetas marca
    # el pedido como despachado —y esa misma pantalla lo puede deshacer—, y la
    # historia tiene que decirlo.
    motivo: Optional[Literal["etiquetas", "deshacer_etiquetas"]] = None

@router.put("/cotizaciones/{cotizacion_id}/estado", response_model=CotizacionRead)
def actualizar_estado_cotizacion(cotizacion_id: str, data: EstadoUpdate, session: Session = Depends(get_session), current_admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))):
    cotizacion = session.get(Cotizacion, cotizacion_id)
    if not cotizacion:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")

    estado_anterior = cotizacion.estado
    cotizacion.estado = data.estado
    session.add(cotizacion)
    _sincronizar_stock_venta(session, cotizacion, estado_anterior, data.estado)
    if estado_anterior != data.estado:
        historia.anotar(session, cotizacion, TipoEvento.ESTADO, historia.de_cuenta(current_admin),
                        de=getattr(estado_anterior, "value", estado_anterior), a=data.estado.value,
                        motivo=data.motivo)
    session.commit()
    session.refresh(cotizacion)
    return _get_cotizacion_read(cotizacion, _mapa_ordenes_de_corte(session, [cotizacion.id]).get(cotizacion.id, []))

@router.get("/cotizaciones/{cotizacion_id}", response_model=CotizacionRead)
def obtener_cotizacion(cotizacion_id: str, session: Session = Depends(get_session), current_admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))):
    cotizacion = session.get(Cotizacion, cotizacion_id)
    if not cotizacion:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    return _get_cotizacion_read(cotizacion, _mapa_ordenes_de_corte(session, [cotizacion.id]).get(cotizacion.id, []))

# Acá vivían `PUT /items/{id}/cortado` y `GET /orden-corte`, del diseño anterior
# a que la orden de corte fuera una entidad propia (`app/models/taller.py`).
# Se borraron el 2026-08-31: nadie los llamaba — el cliente usa
# `/api/v1/ordenes-corte/*` — y dejarlos invitaba a creer que seguían en uso.

@router.delete("/cotizaciones/{cotizacion_id}")
def eliminar_cotizacion(
    cotizacion_id: str,
    db: Session = Depends(get_session),
    admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR")),
):
    """
    Borra un pedido, pero solo mientras no haya dejado rastro en otro lado.

    Antes esto no existia: el boton del panel pedia confirmacion y despues
    mostraba "Simulacion: Cotizacion eliminada". El pedido seguia ahi al
    recargar. Un boton que dice que borro y no borro es peor que no tener boton.

    NO se borra cuando ya paso algo irreversible, porque el borrado dejaria al
    resto del sistema mintiendo:

      · DESPACHADA          ya descontó stock. Sin el pedido, ese descuento
                            queda sin explicacion en el historial.
      · con movimientos     aunque el despacho se haya deshecho, la salida y
                            la vuelta siguen anotadas y apuntan a sus prendas.
      · en una orden de corte  el taller ya la tomó para cortar.
      · con piezas cortadas    la tela ya se corto: el gasto existio.

    En esos casos la salida es CANCELAR, que ya existe y sí revierte lo que
    hay que revertir. El mensaje lo dice, en vez de fallar sin explicar.

    Mismo criterio que el borrado de ordenes de corte, que ya se negaba a
    borrar una finalizada.
    """
    cot = db.get(Cotizacion, cotizacion_id)
    if not cot:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    if cot.estado == EstadoCotizacion.DESPACHADA:
        raise HTTPException(
            status_code=409,
            detail="Este pedido ya salió del local y descontó stock. No se borra: cancélalo.",
        )

    items = db.exec(select(CotizacionItem).where(CotizacionItem.cotizacion_id == cot.id)).all()

    # Un despacho que se deshizo dejó su salida y su vuelta en la bodega. Esa
    # historia apunta a las prendas de este pedido: sin el pedido, nadie
    # podría saber de dónde salió.
    con_movimientos = db.exec(
        select(StockMovement.id).where(StockMovement.reference_id.in_([it.id for it in items]))
    ).first() if items else None
    if con_movimientos:
        raise HTTPException(
            status_code=409,
            detail="Este pedido ya movió stock en la bodega, aunque se haya deshecho. No se borra: cancélalo.",
        )

    if any(it.cortado for it in items):
        raise HTTPException(
            status_code=409,
            detail="Este pedido ya tiene piezas cortadas en el taller. No se borra: cancélalo.",
        )

    ids = [it.id for it in items]
    if ids:
        en_orden = db.exec(
            select(OrdenCorteItem)
            .join(OrdenCorte, OrdenCorteItem.orden_id == OrdenCorte.id)
            .where(
                OrdenCorteItem.cotizacion_item_id.in_(ids),
                OrdenCorte.estado != EstadoOrdenCorte.CANCELADA,
            )
        ).first()
        if en_orden:
            raise HTTPException(
                status_code=409,
                detail="Este pedido está en una orden de corte. Sácalo de la orden o cancela el pedido.",
            )

    # Las opciones que se propusieron en este pedido NO se borran: se
    # desvinculan. La propuesta es informacion del catalogo —alguien pidio ese
    # color— y sigue siendo cierta aunque el pedido ya no exista. Sin esto, la
    # clave foranea impide borrar el pedido y la pantalla devuelve un 500 sin
    # explicar nada.
    for prop in db.exec(
        select(OpcionPropuesta).where(OpcionPropuesta.cotizacion_id == cot.id)
    ).all():
        prop.cotizacion_id = None
        db.add(prop)

    # Su historia se conserva, con esta última línea. Al borrarse el pedido la
    # base deja las anotaciones sin vínculo (ON DELETE SET NULL), y el número
    # sigue diciendo de qué pedido eran.
    historia.anotar(db, cot, TipoEvento.ELIMINADO, historia.de_cuenta(admin))
    for it in items:
        db.delete(it)
    db.delete(cot)
    db.commit()
    return {"ok": True, "numero": cot.numero}


@router.get("/clientes", response_model=List[PersonaRead])
def listar_clientes(session: Session = Depends(get_session), skip: int = 0, limit: int = 100, current_admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))):
    # Se consideran leads/clientes
    clientes = session.exec(select(Persona).where(Persona.tipo_persona.in_([TipoPersona.LEAD, TipoPersona.CLIENTE])).offset(skip).limit(limit)).all()
    return [_get_persona_read(c) for c in clientes]

@router.post("/clientes", response_model=PersonaRead)
def crear_cliente(data: PersonaCreate, session: Session = Depends(get_session), current_admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))):
    # Verificar si ya existe por RUT
    if data.rut:
        persona_existente = session.exec(select(Persona).where(Persona.rut == data.rut)).first()
        if persona_existente:
            raise HTTPException(status_code=400, detail="Ya existe un registro con este RUT")
        
    nueva_persona = Persona(
        rut=data.rut,
        nombres=data.nombres,
        apellidos=data.apellidos,
        email_personal=data.email_personal,
        telefono=data.telefono,
        tipo_persona=data.tipo_persona,
        transporte_preferido=data.transporte_preferido
    )
    session.add(nueva_persona)
    session.commit()
    session.refresh(nueva_persona)
    
    if data.direccion and data.comuna_id:
        nueva_direccion = Direccion(
            persona_id=nueva_persona.id,
            comuna_id=data.comuna_id,
            calle_y_numero=data.direccion
        )
        session.add(nueva_direccion)
        session.commit()
        session.refresh(nueva_persona)
        
    return _get_persona_read(nueva_persona)

@router.put("/clientes/{cliente_id}", response_model=PersonaRead)
def actualizar_cliente(cliente_id: str, data: PersonaCreate, session: Session = Depends(get_session), current_admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))):
    persona = session.get(Persona, cliente_id)
    if not persona:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
        
    # Verificar si ya existe otro registro con este RUT
    if data.rut and data.rut != persona.rut:
        rut_existente = session.exec(select(Persona).where(Persona.rut == data.rut)).first()
        if rut_existente:
            raise HTTPException(status_code=400, detail="Ya existe otro registro con este RUT")
            
    persona.rut = data.rut
    persona.nombres = data.nombres
    persona.apellidos = data.apellidos
    persona.email_personal = data.email_personal
    persona.telefono = data.telefono
    persona.tipo_persona = data.tipo_persona
    persona.transporte_preferido = data.transporte_preferido
    
    session.add(persona)
    
    # Manejar direccion
    if data.direccion and data.comuna_id:
        if persona.direcciones and len(persona.direcciones) > 0:
            dir_act = persona.direcciones[0]
            dir_act.calle_y_numero = data.direccion
            dir_act.comuna_id = data.comuna_id
            session.add(dir_act)
        else:
            nueva_direccion = Direccion(
                persona_id=persona.id,
                comuna_id=data.comuna_id,
                calle_y_numero=data.direccion
            )
            session.add(nueva_direccion)
            
    session.commit()
    session.refresh(persona)
    return _get_persona_read(persona)
