"""
Cuánto se vendió de cada producto en los últimos días: la caja muestra
primero lo que más se vende (decisión del usuario 2026-10-26: que salga solo,
sin favoritos que mantener).

Se cuenta en la bodega, no en los pedidos: una salida por venta es una prenda
que de verdad se fue. Un pedido cancelado no llega a salir.
"""

from datetime import timedelta
from typing import Dict

from sqlalchemy import func
from sqlmodel import Session, select

from ..models.catalog import SKU, MovementType, StockMovement
from .pricing import get_chile_time

DIAS = 30


def vendidos_por_producto(db: Session, dias: int = DIAS) -> Dict[int, int]:
    """{producto_id: unidades que salieron por venta en los últimos `dias`}."""
    desde = get_chile_time() - timedelta(days=dias)
    filas = db.exec(
        select(SKU.product_id, func.sum(StockMovement.quantity))
        .join(SKU, StockMovement.sku_id == SKU.id)
        .where(StockMovement.type == MovementType.SALE, StockMovement.created_at >= desde)
        .group_by(SKU.product_id)
    ).all()
    return {producto_id: -int(cantidad or 0) for producto_id, cantidad in filas}
