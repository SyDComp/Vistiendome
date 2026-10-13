"""
Quitar una prenda de un pedido que todavía no se confirma.

Es lo que se hace cuando, al confirmar, una prenda no se puede conseguir y la
clienta acepta llevar el resto. La prenda se borra, pero la historia del
pedido dice cuál era, cuántas y a qué precio.

No se quita una prenda que ya dejó rastro en otro lado: si estuvo en una orden
de corte, se cortó o movió la bodega, borrarla dejaría a esos registros
apuntando a nada. Para esas está cancelar (E4b).
"""

from sqlmodel import Session, select

from ...models.catalog import StockMovement
from ...models.crm import Cotizacion, CotizacionItem, EstadoCotizacion
from ...models.historia import TipoEvento
from ...models.piezas import PiezaUnica
from .. import piezas
from ...models.taller import OrdenCorte, OrdenCorteItem
from .cotizar import ESTADOS_QUE_SE_COTIZAN, nombre_de_prenda
from .historia import Actor, anotar


class NoSeQuita(Exception):
    """El mensaje dice por qué, en palabras de la tienda."""


def _por_que_no(db: Session, cotizacion: Cotizacion, item: CotizacionItem):
    if EstadoCotizacion(getattr(cotizacion.estado, "value", cotizacion.estado)) not in ESTADOS_QUE_SE_COTIZAN:
        return "Las prendas se quitan mientras el pedido está nuevo o en conversación."
    if item.cortado:
        return "Esta prenda ya se cortó en el taller."
    orden = db.exec(
        select(OrdenCorte.numero)
        .join(OrdenCorteItem, OrdenCorteItem.orden_id == OrdenCorte.id)
        .where(OrdenCorteItem.cotizacion_item_id == item.id)
    ).first()
    if orden is not None:
        return f"Esta prenda está (o estuvo) en la orden de corte N° {orden}."
    if db.exec(select(StockMovement.id).where(StockMovement.reference_id == item.id)).first():
        return "Esta prenda ya movió stock en la bodega."
    return None


def quitar(db: Session, cotizacion: Cotizacion, item: CotizacionItem, actor: Actor) -> None:
    """Borra la prenda y lo anota. No hace commit."""
    motivo = _por_que_no(db, cotizacion, item)
    if motivo:
        raise NoSeQuita(motivo)
    anotar(db, cotizacion, TipoEvento.PRENDA_QUITADA, actor,
           prenda=nombre_de_prenda(item), cantidad=item.cantidad, precio=item.precio_unitario_estimado)
    # Una pieza única asignada vuelve a estar disponible.
    if item.pieza_id:
        pieza = db.get(PiezaUnica, item.pieza_id)
        piezas.liberar(pieza)
        db.add(pieza)
    db.delete(item)
