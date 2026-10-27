"""
Cómo se comparan palabras en la caja: sin tildes, sin plural y sin género
("rojas" encuentra "Rojo"). Las palabras de una o dos letras solo calzan
exactas (la talla "S" no es cualquier palabra que empiece con s).

Es la misma regla de client/src/utils/busquedaCaja.js, que interpreta lo
escrito en el buscador: si una cambia, cambia la otra.
"""

import re
import unicodedata
from typing import List


def normalizar(texto) -> str:
    sin_tildes = unicodedata.normalize("NFD", str(texto or ""))
    return "".join(c for c in sin_tildes if unicodedata.category(c) != "Mn").lower().strip()


def raiz(palabra: str) -> str:
    p = normalizar(palabra)
    if len(p) < 3:
        return p
    return re.sub(r"[aoe]$", "", re.sub(r"s$", "", p))


def palabras(texto) -> List[str]:
    return [p for p in re.split(r"[\s/·,-]+", normalizar(texto)) if p]


def calza(escrita: str, del_valor: str) -> bool:
    if len(escrita) < 3:
        return escrita == normalizar(del_valor)
    return raiz(del_valor).startswith(raiz(escrita))
