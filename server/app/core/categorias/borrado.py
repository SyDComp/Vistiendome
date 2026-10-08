"""
Borrar una categoría: lo que colgaba de ella sube un nivel.

    padre › hijo › subhijo
    borrar subhijo → padre › hijo
    borrar hijo    → padre › subhijo
    borrar padre   → hijo › subhijo   (el hijo pasa a ser principal)

Los productos de la categoría borrada también suben a su padre. Solo si se
borra una principal (no tiene padre) van a "Sin Categoría".

Y el comportamiento no cambia en silencio: una subcategoría que heredaba sus
ajustes de la borrada y que, colgando del nuevo padre, heredaría otros, se
queda con los que tenía (se le copian). Los productos que suben no pueden
llevarse un valor propio: si su abastecimiento cambia, el plan lo dice antes
de borrar, para que quien borra lo vea.
"""

from typing import Dict, Optional

from sqlmodel import Session

from ...models.catalog import Category
from .ajustes import efectivos, etiqueta
from .ubicacion import reubicar


def _conservar_ajustes(hija: Category, nuevo_padre: Optional[Category]) -> None:
    """Le copia a la hija lo que heredaba, si colgando del nuevo padre heredaría otra cosa."""
    antes = efectivos(hija)
    if nuevo_padre is None:
        # Pasa a ser principal: una principal siempre dice sus ajustes.
        if hija.abastecimiento is None:
            hija.abastecimiento = antes.abastecimiento
        if hija.acepta_personalizacion is None:
            hija.acepta_personalizacion = antes.acepta_personalizacion
        return
    despues = efectivos(nuevo_padre)
    if hija.abastecimiento is None and despues.abastecimiento != antes.abastecimiento:
        hija.abastecimiento = antes.abastecimiento
    if hija.acepta_personalizacion is None and despues.acepta_personalizacion != antes.acepta_personalizacion:
        hija.acepta_personalizacion = antes.acepta_personalizacion


def plan(categoria: Category, comodin: Optional[Category]) -> Dict:
    """Qué pasaría al borrarla. No cambia nada: es para mostrarlo antes de confirmar."""
    padre = categoria.parent
    destino = padre or comodin
    productos = [p for p in categoria.products if not p.is_deleted]
    abast_antes = efectivos(categoria).abastecimiento
    abast_despues = efectivos(destino).abastecimiento if destino is not None else None
    return {
        "categoria": categoria.name,
        "subcategorias": len(categoria.subcategories),
        "subcategorias_pasan_a": padre.name if padre else None,  # None: pasan a ser principales
        "productos": len(productos),
        "productos_pasan_a": destino.name if destino else None,
        "abastecimiento_de_productos": (
            {"de": etiqueta(abast_antes), "a": etiqueta(abast_despues)}
            if productos and abast_antes != abast_despues else None
        ),
    }


def borrar(db: Session, categoria: Category, comodin: Optional[Category]) -> None:
    """Sube un nivel lo que colgaba de la categoría y la borra. No hace commit."""
    padre = categoria.parent
    for hija in list(categoria.subcategories):
        _conservar_ajustes(hija, padre)
        # Por la relación y no por la columna: si quedara en
        # `categoria.subcategories`, el borrado la arrastraría.
        hija.parent = padre
        reubicar(db, hija, padre)

    destino = padre or comodin
    for producto in list(categoria.products):
        producto.category = destino
        db.add(producto)

    db.delete(categoria)
