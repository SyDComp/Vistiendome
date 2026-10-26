"""
En qué orden se muestran las características: la caja, la orden de corte, el
selector de variantes y la etiqueta las recorren en este orden.

Antes estaba fijo en el navegador (talla, color, estampado, y el resto por
nombre). Ahora lo decide la tienda desde Características, incluidas las del
sistema: el orden solo cambia cómo se muestran, no qué son ni cómo se
comportan (decisión del usuario 2026-10-26).
"""

from typing import List

from sqlalchemy import func
from sqlmodel import Session, select

from ...models.catalog import Characteristic


class NoSeReordena(Exception):
    """La lista no son exactamente las características que hay."""


def siguiente_orden(db: Session) -> int:
    """Una característica nueva va al final."""
    return (db.exec(select(func.max(Characteristic.orden))).one() or 0) + 1


def reordenar(db: Session, ids: List[int]) -> List[Characteristic]:
    """
    Las deja en el orden de `ids`, que tienen que ser todas y cada una una
    sola vez: una lista a medias dejaría órdenes repetidos.
    """
    todas = {c.id: c for c in db.exec(select(Characteristic)).all()}
    if len(ids) != len(set(ids)) or set(ids) != set(todas):
        raise NoSeReordena("Para ordenar hay que mandar todas las características, cada una una vez.")
    for posicion, id_ in enumerate(ids, start=1):
        todas[id_].orden = posicion
        db.add(todas[id_])
    return [todas[i] for i in ids]
