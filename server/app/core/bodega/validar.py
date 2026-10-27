"""Lo que todo lote tiene que cumplir antes de mirar la bodega."""

from typing import Iterable, List

from sqlmodel import Session, select

from ...models.catalog import SKU
from .rechazo import LoteInvalido

TOPE = 2000


def variantes_del_lote(db: Session, sku_ids: Iterable[int], motivo: str) -> List[int]:
    """Los ids del lote, revisados: sin repetir, existentes, vigentes y con motivo."""
    ids = list(sku_ids)
    if not ids:
        raise LoteInvalido("Elige al menos una variante.")
    if len(ids) > TOPE:
        raise LoteInvalido(f"Un lote puede tener hasta {TOPE} variantes; este tiene {len(ids)}.")
    if len(set(ids)) != len(ids):
        raise LoteInvalido("Hay variantes repetidas en el lote.")
    if not (motivo or "").strip():
        raise LoteInvalido("Escribe el motivo del movimiento.")
    vigentes = set(db.exec(select(SKU.id).where(SKU.id.in_(ids), SKU.is_deleted == False)).all())
    faltan = [i for i in ids if i not in vigentes]
    if faltan:
        raise LoteInvalido(f"Estas variantes no existen o están dadas de baja: {faltan}.")
    return ids
