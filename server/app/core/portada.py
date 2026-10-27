"""
La portada de un producto: la foto que lo representa en una tarjeta o un
listado. Una sola regla para todas las pantallas (el listado del panel, las
tarjetas de la caja, el catálogo y la ficha del sitio):

  1. La principal de su galería.
  2. Si ninguna es principal, la de menor id de su galería.
  3. Si la galería está vacía, la primera foto de sus variantes vigentes
     (la variante de menor id que tenga foto; dentro de ella, la de menor id).

Antes cada pantalla la elegía a su manera: el panel y la caja miraban solo la
galería, y un producto con las fotos cargadas en sus variantes salía con el
ícono de caja; el sitio sí caía a las variantes, pero tomaba el elemento [0]
de una lista sin orden, ignorando la principal. Siempre se ordena: Postgres no
garantiza el orden de las filas, y sin orden la portada cambia entre recargas.

Devuelve el MediaAsset, no la URL: quien arma la respuesta necesita también
sus derivadas webp (srcset_de) para no bajar el original.
"""

from typing import Dict, Iterable

from sqlmodel import Session, select

from ..models.catalog import SKU, MediaAsset, ProductMediaLink, SKUMediaLink


def portadas(db: Session, producto_ids: Iterable[int]) -> Dict[int, MediaAsset]:
    """{producto_id: MediaAsset}. Un producto sin ninguna foto no aparece."""
    ids = list(set(producto_ids))
    if not ids:
        return {}

    elegidas: Dict[int, MediaAsset] = {}
    for pid, asset in db.exec(
        select(ProductMediaLink.product_id, MediaAsset)
        .join(MediaAsset, ProductMediaLink.media_asset_id == MediaAsset.id)
        .where(ProductMediaLink.product_id.in_(ids))
        .order_by(ProductMediaLink.product_id, ProductMediaLink.is_main.desc(), MediaAsset.id)
    ).all():
        elegidas.setdefault(pid, asset)

    sin_galeria = [pid for pid in ids if pid not in elegidas]
    if sin_galeria:
        for pid, asset in db.exec(
            select(SKU.product_id, MediaAsset)
            .join(SKUMediaLink, SKUMediaLink.sku_id == SKU.id)
            .join(MediaAsset, SKUMediaLink.media_asset_id == MediaAsset.id)
            .where(SKU.product_id.in_(sin_galeria), SKU.is_deleted == False)
            .order_by(SKU.product_id, SKU.id, MediaAsset.id)
        ).all():
            elegidas.setdefault(pid, asset)

    return elegidas
