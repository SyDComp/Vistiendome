"""
El abono mínimo para confirmar un pedido: un porcentaje del total, según de
dónde salen las prendas (Ajustes del negocio).

  · si algo lo hace el taller: por defecto 50%. Cortar tela cuesta material
    que no se recupera.
  · si todo sale de bodega: por defecto 100%. La prenda ya existe.

El sistema propone y la persona decide: se puede confirmar sin el abono, con
una nota de por qué (decisión del usuario 2026-10-13).
"""

import math
from typing import Iterable, NamedTuple, Optional

from sqlmodel import Session

from .. import ajustes_negocio

TALLER = "taller"
BODEGA = "bodega"


class Abono(NamedTuple):
    minimo: int        # en pesos, redondeado hacia arriba
    porcentaje: int
    por: str           # "taller" o "bodega"


def minimo(db: Session, total: int, caminos: Iterable[Optional[str]]) -> Abono:
    por = TALLER if any(c == "TALLER" for c in caminos) else BODEGA
    porcentaje = ajustes_negocio.leer(db, ajustes_negocio.ABONO_MINIMO)[por]
    return Abono(math.ceil(total * porcentaje / 100), porcentaje, por)
