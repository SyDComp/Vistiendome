"""La foto de cada producto para las tarjetas: la principal, o cualquiera si no hay principal."""

from typing import Dict, List, Tuple

from sqlmodel import Session, select

from ...models.catalog import MediaAsset, ProductMediaLink
from ..imagenes import srcset_de


def fotos(db: Session, producto_ids: List[int]) -> Dict[int, Tuple[str, str]]:
    """{producto_id: (url, srcset de las derivadas webp)}: la tarjeta no baja el original."""
    elegidas = {}
    if not producto_ids:
        return {}
    for pid, principal, asset in db.exec(
        select(ProductMediaLink.product_id, ProductMediaLink.is_main, MediaAsset)
        .join(MediaAsset, ProductMediaLink.media_asset_id == MediaAsset.id)
        .where(ProductMediaLink.product_id.in_(producto_ids))
    ).all():
        if pid not in elegidas or principal:
            elegidas[pid] = asset
    return {pid: (a.url, srcset_de(a)) for pid, a in elegidas.items()}
