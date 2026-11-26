"""
Cómo se escribe en el libro de bodega.

LOS MOVIMIENTOS NO SE BORRAN
Cada movimiento es algo que pasó. Si un hecho se deshace —se revierte un
despacho, se reabre una orden de corte— no se borra lo anotado: se agrega un
movimiento de vuelta. El saldo queda igual que si se hubiera borrado, y además
queda escrito que pasó y que se deshizo.

UN HECHO, UN SALDO
Un hecho del negocio es la prenda de un pedido o la línea de una orden de
corte, y sus movimientos le apuntan por identidad (StockMovement). Lo que ese
hecho movió es la suma de sus movimientos. Para registrarlo o deshacerlo se
dice cuánto TIENE que haber movido, y se agrega solo la diferencia: repetir la
misma orden no mueve nada dos veces.
"""

from typing import Iterable, Optional, Union

from sqlmodel import Session, func, select

from ..models.catalog import MovementType, StockMovement
from ..models.crm import CotizacionItem
from ..models.taller import OrdenCorteItem

Hecho = Union[CotizacionItem, OrdenCorteItem]


def _origen(hecho: Hecho) -> dict:
    """La columna del movimiento que apunta a ese hecho."""
    if isinstance(hecho, CotizacionItem):
        return {"cotizacion_item_id": hecho.id}
    if isinstance(hecho, OrdenCorteItem):
        return {"orden_corte_item_id": hecho.id}
    raise TypeError(f"{type(hecho).__name__} no es un hecho de bodega")


def neto_de(db: Session, hecho: Hecho) -> int:
    """Cuánto movió en total ese hecho, sumando todo lo anotado."""
    (columna, valor), = _origen(hecho).items()
    total = db.exec(
        select(func.sum(StockMovement.quantity)).where(getattr(StockMovement, columna) == valor)
    ).one()
    return int(total or 0)


def llevar_a(
    db: Session,
    *,
    sku_id: int,
    hecho: Hecho,
    objetivo: int,
    tipo_si_resta: MovementType,
    tipo_si_suma: MovementType,
    nota: str,
) -> Optional[StockMovement]:
    """
    Deja lo movido por ese hecho en `objetivo`, agregando un movimiento
    por la diferencia. Si ya está ahí, no agrega nada y devuelve None.

    Ejemplos, con la prenda de un pedido:
      despachar    objetivo = -cantidad  -> agrega una salida
      deshacer     objetivo = 0          -> agrega una vuelta
      redespachar  objetivo = -cantidad  -> agrega otra salida
    """
    diferencia = objetivo - neto_de(db, hecho)
    if diferencia == 0:
        return None
    movimiento = StockMovement(
        sku_id=sku_id,
        type=tipo_si_suma if diferencia > 0 else tipo_si_resta,
        quantity=diferencia,
        note=nota,
        **_origen(hecho),
    )
    db.add(movimiento)
    return movimiento


def tienen_historia(db: Session, sku_ids: Iterable[int]) -> set:
    """
    Cuáles de estas variantes tienen algo anotado que no se puede perder:
    movimientos de bodega, prendas de pedidos o líneas de órdenes de corte.
    """
    from ..models.crm import CotizacionItem
    from ..models.taller import OrdenCorteItem

    ids = {i for i in sku_ids if i}
    if not ids:
        return set()
    con = set(db.exec(select(StockMovement.sku_id).where(StockMovement.sku_id.in_(ids))).all())
    con |= set(db.exec(select(CotizacionItem.sku_id).where(CotizacionItem.sku_id.in_(ids))).all())
    con |= set(db.exec(select(OrdenCorteItem.sku_id).where(OrdenCorteItem.sku_id.in_(ids))).all())
    return con
