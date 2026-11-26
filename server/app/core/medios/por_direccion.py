"""
Qué foto de la Galería es una dirección.

El panel elige la portada de una colección y manda su dirección
("/media/abc.jpg"), a veces la de una versión liviana
("/media/derivadas/abc_md.webp").
Aquí se reconoce la foto, para guardarla por su id.
"""

import os
import re
from typing import Optional

from sqlmodel import Session, select

from ...models.catalog import MediaAsset
from ..imagenes import TAMANOS

# Las versiones livianas se llaman como el original más "_<etiqueta>" (sm, md…),
# en .webp y dentro de /media/derivadas/ (core/imagenes).
_DERIVADA = re.compile(r"_(" + "|".join(TAMANOS) + r")$")


def foto_por_direccion(db: Session, url: Optional[str]) -> Optional[MediaAsset]:
    if not url:
        return None
    url = url.split("?")[0].strip()
    asset = db.exec(select(MediaAsset).where(MediaAsset.url == url)).first()
    if asset:
        return asset
    base, _ = os.path.splitext(os.path.basename(url))
    base = _DERIVADA.sub("", base)
    for candidato in db.exec(select(MediaAsset).where(MediaAsset.filename.like(f"{base}.%"))).all():
        return candidato
    return None
