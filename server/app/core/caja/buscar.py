"""
Lo que muestra el buscador de la caja mientras se escribe: todo lo que
cumple, también lo que no tiene stock (sale "sin stock", después de lo que
sí hay), y cuántos son: en total, y de cuántos productos y piezas únicas
(las tarjetas muestran productos, no variantes: "13 variantes de 1
producto" explica por qué al abrirlas queda una).
"""

from dataclasses import dataclass
from typing import List

from sqlmodel import Session

from .filtro import Filtro, cumple
from .libres import Libre, piezas_libres, variantes_del_catalogo


@dataclass
class Encontrado:
    resultados: List[Libre]
    total: int
    productos: int
    piezas: int


def buscar(db: Session, filtro: Filtro, cuantos: int = 8) -> Encontrado:
    todos = [x for x in variantes_del_catalogo(db) + piezas_libres(db) if cumple(x, filtro)]
    todos.sort(key=lambda x: x.disponible <= 0)   # estable: lo que hay, primero
    return Encontrado(
        resultados=todos[:cuantos], total=len(todos),
        productos=len({x.producto_id for x in todos if x.tipo == "variante"}),
        piezas=sum(1 for x in todos if x.tipo == "pieza"),
    )
