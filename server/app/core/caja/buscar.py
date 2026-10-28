"""
Lo que muestra el buscador de la caja mientras se escribe: todo lo que
cumple, también lo que no tiene stock (sale "sin stock", después de lo que
sí hay), y cuántos son.
"""

from typing import List, Tuple

from sqlmodel import Session

from .filtro import Filtro, cumple
from .libres import Libre, piezas_libres, variantes_del_catalogo


def buscar(db: Session, filtro: Filtro, cuantos: int = 8) -> Tuple[List[Libre], int]:
    todos = [x for x in variantes_del_catalogo(db) + piezas_libres(db) if cumple(x, filtro)]
    todos.sort(key=lambda x: x.disponible <= 0)   # estable: lo que hay, primero
    return todos[:cuantos], len(todos)
