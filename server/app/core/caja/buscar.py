"""Lo que muestra el buscador de la caja mientras se escribe: lo libre que cumple, y cuántos son."""

from typing import List, Tuple

from sqlmodel import Session

from .filtro import Filtro, cumple
from .libres import Libre, piezas_libres, variantes_libres


def buscar(db: Session, filtro: Filtro, cuantos: int = 8) -> Tuple[List[Libre], int]:
    todos = [x for x in variantes_libres(db) + piezas_libres(db) if cumple(x, filtro)]
    return todos[:cuantos], len(todos)
