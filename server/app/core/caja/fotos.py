"""La foto de cada producto para las tarjetas: su portada (la regla vive en core/portada.py)."""

from typing import Dict, List, Tuple

from sqlmodel import Session

from ..imagenes import srcset_de
from ..portada import portadas


def fotos(db: Session, producto_ids: List[int]) -> Dict[int, Tuple[str, str]]:
    """{producto_id: (url, srcset de las derivadas webp)}: la tarjeta no baja el original."""
    return {pid: (a.url, srcset_de(a)) for pid, a in portadas(db, producto_ids).items()}
