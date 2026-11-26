"""
Qué comuna es la de un despacho.

La tienda y el panel la eligen de la lista de comunas y mandan su id (y su
nombre y el de la región, para mostrarlos). El pedido guarda la comuna por
identidad; la región es la de la comuna. Antes guardaba los dos nombres como
texto, sin enlace a las tablas de regiones y comunas que ya existían.
"""

import unicodedata
from typing import Optional

from sqlmodel import Session, select

from ..models.geo import Comuna, Region


class ComunaInexistente(ValueError):
    """La comuna nombrada no está en la lista. El mensaje es para la tienda."""


def _clave(texto: Optional[str]) -> str:
    sin_tildes = unicodedata.normalize("NFD", str(texto or ""))
    sin_tildes = "".join(c for c in sin_tildes if unicodedata.category(c) != "Mn")
    return " ".join(sin_tildes.split()).casefold()


def comuna_de(db: Session, comuna_id: Optional[int], comuna: Optional[str], region: Optional[str]) -> Optional[Comuna]:
    """La comuna por su id; si no viene, por su nombre (y el de su región). Nada nombrado = None."""
    if comuna_id:
        encontrada = db.get(Comuna, int(comuna_id))
        if encontrada is None:
            raise ComunaInexistente("Esa comuna no está en la lista. Recarga la página y vuelve a elegirla.")
        return encontrada
    if not (comuna or "").strip():
        return None
    candidatas = db.exec(select(Comuna).where(Comuna.nombre.is_not(None))).all()
    candidatas = [c for c in candidatas if _clave(c.nombre) == _clave(comuna)]
    if region and len(candidatas) > 1:
        candidatas = [c for c in candidatas if c.region and _clave(c.region.nombre) == _clave(region)]
    if len(candidatas) != 1:
        raise ComunaInexistente(f"«{comuna}» no es una comuna de la lista. Elígela de la lista de comunas.")
    return candidatas[0]
