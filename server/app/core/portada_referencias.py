"""
Lo que los bloques de la portada nombran por identidad, resuelto al leer.

  · Una capa con `asset_id`: su dirección y sus versiones livianas de hoy. Si
    la foto cambió de nombre, se sigue viendo.
  · Una capa con `sku_id` (una prenda del catálogo puesta en la portada): su
    link de hoy, con la dirección del producto y el código de la variante.
    Antes se copiaba el link del momento y quedaba viejo al renombrar el
    producto. Si la variante ya no se vende, la capa no se muestra: llevaría
    a una prenda que no está.
"""

from typing import Any

from sqlmodel import Session

from ..models.catalog import SKU, MediaAsset
from .imagenes import srcset_de

_RETIRADA = object()


def _resolver(nodo: Any, db: Session) -> Any:
    if isinstance(nodo, dict):
        if nodo.get("sku_id"):
            sku = db.get(SKU, nodo["sku_id"])
            if sku is None or sku.is_deleted or sku.product is None or sku.product.is_deleted:
                return _RETIRADA
            nodo = {**nodo, "link": f"/catalogo/producto/{sku.product.slug}/{sku.sku}"}
        resuelto = {}
        for k, v in nodo.items():
            r = _resolver(v, db)
            resuelto[k] = None if r is _RETIRADA else r
        if resuelto.get("asset_id"):
            asset = db.get(MediaAsset, resuelto["asset_id"])
            if asset:
                resuelto["url"] = asset.url
                # Las capas de los bloques hero son las imágenes más grandes de
                # la portada: sin esto se bajaban completas (~450 KB cada una).
                resuelto["srcset"] = srcset_de(asset)
        return resuelto
    if isinstance(nodo, list):
        return [r for r in (_resolver(x, db) for x in nodo) if r is not _RETIRADA]
    return nodo


def resolver(config: Any, db: Session) -> Any:
    """El JSON de un bloque con las fotos y prendas de hoy."""
    r = _resolver(config, db)
    return {} if r is _RETIRADA else r
