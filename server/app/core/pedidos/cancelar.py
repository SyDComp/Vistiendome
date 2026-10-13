"""
Cancelar una prenda de un pedido, o el pedido entero (que es cancelar todas).

La prenda no se borra: queda en el pedido, tachada, con su historia. Y lo que
ya existía no se pierde (decisión del usuario 2026-10-13):

  · lo apartado en bodega queda libre solo (el apartado se calcula);
  · una pieza única asignada vuelve a estar disponible;
  · lo que el taller YA hizo:
      del catálogo (tiene variante) → entra a la bodega, a su variante;
      personalizado                 → queda en Piezas únicas, una por unidad;
  · lo que está en una orden de corte sin terminar sigue en la orden, y va a
    bodega o a Piezas únicas cuando se termine (ver `al_terminar_la_orden`).

La cancelación no se deshace: si hace falta, la prenda se agrega de nuevo.
"""

from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Session, select

from ...models.catalog import MovementType
from ...models.crm import Cotizacion, CotizacionItem, EstadoCotizacion
from ...models.historia import TipoEvento
from ...models.piezas import PiezaUnica
from ...models.taller import EstadoOrdenCorte, OrdenCorte, OrdenCorteItem
from .. import movimientos, piezas
from .cotizar import nombre_de_prenda
from .historia import Actor, anotar
from .prendas import activas

BODEGA = "bodega"
PIEZAS = "piezas"
AL_TERMINAR = "al_terminar"


class NoSeCancela(Exception):
    """El mensaje dice por qué, en palabras de la tienda."""


def _lo_hecho_a_su_lugar(db: Session, item: CotizacionItem, hecha: bool, pedido_numero, nota: str) -> Optional[str]:
    """
    Lleva lo hecho de una prenda cancelada a donde corresponde (o lo retira, si
    `hecha` es falso porque se reabrió la orden). Devuelve el destino.
    """
    if item.sku_id:
        movimientos.llevar_a(
            db, sku_id=item.sku_id, reference_id=item.id, objetivo=item.cantidad if hecha else 0,
            tipo_si_suma=MovementType.RECEIPT, tipo_si_resta=MovementType.ADJUSTMENT, nota=nota,
        )
        return BODEGA
    piezas.llevar_a(db, item, item.cantidad if hecha else 0, pedido_numero, nota_baja=nota)
    return PIEZAS


def _orden_sin_terminar(db: Session, item: CotizacionItem) -> Optional[int]:
    return db.exec(
        select(OrdenCorte.numero)
        .join(OrdenCorteItem, OrdenCorteItem.orden_id == OrdenCorte.id)
        .where(
            OrdenCorteItem.cotizacion_item_id == item.id,
            OrdenCorte.estado.in_([EstadoOrdenCorte.PENDIENTE, EstadoOrdenCorte.EN_PROCESO]),
        )
    ).first()


def _cancelar(db: Session, cotizacion: Cotizacion, item: CotizacionItem) -> Optional[str]:
    """Cancela una prenda y lleva lo que haya a su lugar. Devuelve el destino. No anota."""
    destino = None
    if item.pieza_id:
        pieza = db.get(PiezaUnica, item.pieza_id)
        piezas.liberar(pieza)
        db.add(pieza)
        destino = PIEZAS
    elif item.cortado:
        destino = _lo_hecho_a_su_lugar(
            db, item, True, cotizacion.numero,
            nota=f"Pedido #{cotizacion.numero}: se canceló una prenda que ya estaba hecha",
        )
    elif _orden_sin_terminar(db, item) is not None:
        destino = AL_TERMINAR
    item.cancelada_en = datetime.now(timezone.utc)
    db.add(item)
    return destino


def cancelar_prenda(db: Session, cotizacion: Cotizacion, item: CotizacionItem, actor: Actor) -> Optional[str]:
    """
    Cancela una prenda de un pedido confirmado y lo anota. Devuelve el destino
    de lo hecho (o None). No hace commit.

    Antes de confirmar no se cancela: se quita (quitar.py), porque todavía no
    se había acordado nada.
    """
    if EstadoCotizacion(getattr(cotizacion.estado, "value", cotizacion.estado)) != EstadoCotizacion.CONFIRMADA:
        raise NoSeCancela(
            "Se cancela una prenda de un pedido confirmado. "
            "Si todavía se conversa, quítala; si ya salió, no se cancela."
        )
    if item.cancelada_en is not None:
        raise NoSeCancela("Esta prenda ya estaba cancelada.")
    destino = _cancelar(db, cotizacion, item)
    anotar(db, cotizacion, TipoEvento.PRENDA_CANCELADA, actor,
           prenda=nombre_de_prenda(item), cantidad=item.cantidad, destino=destino)
    return destino


def cancelar_pedido(db: Session, cotizacion: Cotizacion, actor: Actor) -> None:
    """
    Al cancelar el pedido entero: cada prenda que sigue en pedido se cancela con
    la misma regla. Se anota solo la que tenía algo hecho: es lo que hay que
    saber dónde quedó. No cambia el estado (eso lo hace quien llama). No hace commit.
    """
    for item in activas(cotizacion):
        destino = _cancelar(db, cotizacion, item)
        if destino:
            anotar(db, cotizacion, TipoEvento.PRENDA_CANCELADA, actor,
                   prenda=nombre_de_prenda(item), cantidad=item.cantidad, destino=destino)


def al_terminar_la_orden(db: Session, item: CotizacionItem, terminada: bool, orden_numero: int, actor: Actor) -> None:
    """
    Una orden de corte se terminó (o se reabrió) con una prenda que ya estaba
    cancelada: lo hecho va a bodega o a Piezas únicas (o se retira de ahí).
    No hace commit.
    """
    cotizacion = item.cotizacion
    nota = (f"Orden de corte N° {orden_numero}: terminada una prenda cancelada del pedido #{cotizacion.numero}"
            if terminada else
            f"Se reabrió la orden de corte N° {orden_numero} (prenda cancelada del pedido #{cotizacion.numero})")
    destino = _lo_hecho_a_su_lugar(db, item, terminada, cotizacion.numero, nota)
    if terminada:
        anotar(db, cotizacion, TipoEvento.CANCELADA_TERMINADA, actor,
               prenda=nombre_de_prenda(item), cantidad=item.cantidad, destino=destino, orden=orden_numero)
