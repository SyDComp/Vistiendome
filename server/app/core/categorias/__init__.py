"""Categorías: sus ajustes con herencia, su lugar en el árbol y cómo se borran."""

from .ajustes import (
    ABASTECIMIENTOS, SE_DECIDE_AL_CONFIRMAR, SOLO_BODEGA, TALLER,
    Efectivos, efectivos, etiqueta, validar_abastecimiento,
)
from .borrado import borrar, plan
from .ubicacion import descendientes, reubicar, slug_unico, slugify, ubicar

__all__ = [
    "ABASTECIMIENTOS", "SE_DECIDE_AL_CONFIRMAR", "SOLO_BODEGA", "TALLER",
    "Efectivos", "efectivos", "etiqueta", "validar_abastecimiento",
    "borrar", "plan",
    "descendientes", "reubicar", "slug_unico", "slugify", "ubicar",
]
