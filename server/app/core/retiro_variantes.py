"""
Qué pasa con una variante que se quita del catálogo.

Si tiene historia —movimientos de bodega, prendas de pedidos, líneas de
órdenes de corte— se da de baja: deja de venderse y de mostrarse, y todo lo
anotado sigue apuntándole. Si no tiene nada, se borra: no hay qué conservar.

Antes se borraba siempre, y con ella sus movimientos de bodega. Así se perdía
la historia de lo que entró y salió de esa variante.
"""

from typing import Iterable, Tuple

from sqlmodel import Session, delete

from ..models.catalog import SKU, SKUMediaLink, CollectionSKULink
from .movimientos import tienen_historia


def retirar(db: Session, skus: Iterable[SKU]) -> Tuple[int, int]:
    """Quita estas variantes del catálogo. Devuelve (dadas de baja, borradas)."""
    skus = list(skus)
    con_historia = tienen_historia(db, [s.id for s in skus])
    de_baja = borradas = 0
    for sku in skus:
        # Las colecciones son vitrina, no historia: una variante que ya no se
        # vende no se sigue ofreciendo en ellas.
        db.exec(delete(CollectionSKULink).where(CollectionSKULink.sku_id == sku.id))
        if sku.id in con_historia:
            sku.is_deleted = True
            db.add(sku)
            de_baja += 1
        else:
            db.exec(delete(SKUMediaLink).where(SKUMediaLink.sku_id == sku.id))
            db.delete(sku)
            borradas += 1
    return de_baja, borradas
