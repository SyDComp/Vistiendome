"""
Dónde está una categoría en el árbol (nivel y ruta) y su dirección pública.

El slug es la dirección pública: se elige al crear la categoría y no cambia al
renombrarla ni al moverla. Antes se recalculaba desde el nombre en cada
cambio: la dirección cambiaba, y renombrar una "Noemi" cuando ya había otra
chocaba con ella (el slug es único) y daba un error.
"""

import re
import unicodedata
from typing import List, Optional

from sqlmodel import Session, select

from ...models.catalog import Category


def slugify(texto: str) -> str:
    """Texto a slug de URL, con _ entre palabras."""
    texto = unicodedata.normalize("NFKD", texto or "").encode("ascii", "ignore").decode("utf-8").lower()
    texto = re.sub(r"[^a-z0-9\s-]", "", texto)
    return re.sub(r"[\s-]+", "_", texto).strip("_")


def _ocupado(db: Session, slug: str) -> bool:
    return db.exec(select(Category.id).where(Category.slug == slug)).first() is not None


def slug_unico(db: Session, nombre: str, padre: Optional[Category]) -> str:
    """
    Un slug libre para una categoría nueva: su nombre; si ya existe, con el de
    su padre adelante ("poleras_noemi"); y si aún choca, con un número.
    """
    candidatos = [slugify(nombre)]
    if padre is not None:
        candidatos.append(slugify(f"{padre.name} {nombre}"))
    for candidato in candidatos:
        if candidato and not _ocupado(db, candidato):
            return candidato
    base = candidatos[-1] or "categoria"
    n = 2
    while _ocupado(db, f"{base}_{n}"):
        n += 1
    return f"{base}_{n}"


def ubicar(categoria: Category, padre: Optional[Category]) -> None:
    """Nivel y ruta (ej: /raiz/hija) según de quién cuelga."""
    categoria.level = (padre.level + 1) if padre else 1
    categoria.path = f"{padre.path}/{categoria.slug}" if padre else f"/{categoria.slug}"


def reubicar(db: Session, categoria: Category, padre: Optional[Category]) -> None:
    """Recalcula nivel y ruta de la categoría y de todo lo que cuelga de ella. El slug no cambia."""
    ubicar(categoria, padre)
    db.add(categoria)
    for hija in categoria.subcategories:
        reubicar(db, hija, categoria)


def descendientes(categoria: Category) -> List[Category]:
    """Todo lo que cuelga de la categoría, a cualquier profundidad."""
    todos = []
    for hija in categoria.subcategories:
        todos.append(hija)
        todos.extend(descendientes(hija))
    return todos
