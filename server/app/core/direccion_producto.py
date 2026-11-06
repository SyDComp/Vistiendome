"""
La dirección pública de un producto: siempre sale de su nombre.

Antes se fijaba al crearlo y no cambiaba más: un producto creado como
"vestidito" y renombrado "vestido perla" seguía en /producto/pr-vestidito
(decisión del usuario 2026-11-06: depende del nombre). La decide el servidor;
lo que mande el formulario es solo una vista previa.
"""

from typing import Optional

from sqlmodel import Session, select

from ..models.catalog import Product
from .categorias.ubicacion import slugify


def _ocupada(db: Session, direccion: str, producto_id: Optional[int]) -> bool:
    # También las de productos dados de baja: el slug es único en la tabla.
    consulta = select(Product.id).where(Product.slug == direccion)
    if producto_id is not None:
        consulta = consulta.where(Product.id != producto_id)
    return db.exec(consulta).first() is not None


def direccion_de(db: Session, nombre: str, producto_id: Optional[int] = None) -> str:
    """`pr-` y el nombre; si otro producto ya la usa, con un número."""
    base = f"pr-{slugify(nombre) or 'producto'}"
    if not _ocupada(db, base, producto_id):
        return base
    n = 2
    while _ocupada(db, f"{base}_{n}", producto_id):
        n += 1
    return f"{base}_{n}"
