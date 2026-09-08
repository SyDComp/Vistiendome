"""
Filtrar lo que un cliente escribe antes de que llegue al catálogo.

Esto existe porque el texto lo escribe cualquiera desde internet. Una opción
propuesta va a parar a la bandeja de Paola y, si se aprueba, al catálogo que ve
todo el mundo. Hay dos formas de ensuciarlo, y son distintas:

  · A PROPÓSITO  "color caca", insultos, propaganda. Se rechaza en el momento:
                 no tiene por qué llegar a la bandeja de nadie.
  · SIN QUERER   "turkesa" por "Turquesa", "azl" por "Azul". No es basura, es
                 un dedo torpe. Rechazarlo sería maltratar a una clienta que
                 está pidiendo bien; lo que corresponde es preguntarle si quiso
                 decir la que ya existe.

La lista de términos bloqueados NO se hardcodea: vive en ajustes, como el resto
de las reglas del negocio, porque quién decide qué es ofensivo es la clienta y
no nosotros. Acá sólo hay un mínimo razonable por si nadie configuró nada.

Y aun con filtro, la red de seguridad de verdad es que NADA propuesto se
publica solo: Paola aprueba una por una.
"""

import re
import unicodedata
from difflib import SequenceMatcher
from typing import List, Optional, Tuple


# Mínimo por si ajustes viene vacío. No pretende ser exhaustivo —ninguna lista
# lo es— y por eso no es la única defensa.
BLOQUEADAS_POR_DEFECTO = [
    "pichula", "conchetumare", "conchatumadre", "ctm", "culiao", "culia",
    "hijo de puta", "hijo de perra", "puta", "puto", "mierda", "caca",
    "pene", "vagina", "teta", "culo", "verga", "coño", "polla",
    "maricon", "weon", "aweonao", "zorra", "perra",
]


def _plano(texto: str) -> str:
    """Minúsculas, sin acentos. Para comparar sin que la tilde despiste."""
    limpio = unicodedata.normalize("NFD", str(texto or ""))
    limpio = "".join(c for c in limpio if unicodedata.category(c) != "Mn")
    return " ".join(limpio.lower().split())


def _sin_repeticiones(texto: str) -> str:
    """
    "puuuutaaa" -> "puta". Estirar letras es la forma más común de colarse por
    una lista de términos, y cuesta una línea taparla.
    """
    return re.sub(r"(.)\1{1,}", r"\1", texto)


def es_ofensivo(texto: str, bloqueadas: Optional[List[str]] = None) -> bool:
    """
    ¿Esto no debería llegar ni a la bandeja?

    Se compara sobre el texto aplanado y también sobre el texto sin letras
    repetidas y sin separadores, para que "c u l i a o" y "cuuuliao" no pasen
    por el sólo hecho de estar escritos raro.
    """
    lista = [t for t in (bloqueadas if bloqueadas is not None else BLOQUEADAS_POR_DEFECTO) if t]
    if not lista:
        return False

    plano = _plano(texto)
    variantes = {
        plano,
        _sin_repeticiones(plano),
        re.sub(r"[^a-z0-9]", "", plano),
        _sin_repeticiones(re.sub(r"[^a-z0-9]", "", plano)),
    }

    for termino in lista:
        t = _plano(termino)
        if not t:
            continue
        compacto = re.sub(r"[^a-z0-9]", "", t)
        for v in variantes:
            if t in v or (compacto and compacto in v):
                return True
    return False


def _ordenado(texto: str) -> str:
    """Las mismas palabras en otro orden. "Rosa Palo" y "Palo Rosa" son el mismo color."""
    return " ".join(sorted(_plano(texto).split()))


def parecido(a: str, b: str) -> float:
    """
    0 a 1. 1 es idéntico.

    Se mide también con las palabras ordenadas: escrito al revés, "Rosa Palo"
    contra "Palo Rosa" da 0.44 y se colaría como color nuevo siendo el mismo.
    """
    directo = SequenceMatcher(None, _plano(a), _plano(b)).ratio()
    invertido = SequenceMatcher(None, _ordenado(a), _ordenado(b)).ratio()
    return max(directo, invertido)


def sugerencia(valor: str, existentes: List[str], umbral: float = 0.78) -> Optional[str]:
    """
    ¿Se parece tanto a una opción que ya existe que seguramente es un tipeo?

    Devuelve la opción existente más parecida, o None. Es una SUGERENCIA: quien
    decide es la persona que escribió. Corregirlo solo sería peor — "Azul Rey"
    y "Azul Marino" se parecen mucho y son telas distintas.

    El umbral sale de medir contra el catálogo real: los tipeos caen entre 0.80
    y 0.95 ("turkesa" 0.800, "azul marno" 0.952) y las propuestas legítimas no
    pasan de 0.727 ("Turquesa Perla", "Verde Musgo", "Azul Rey"). 0.78 parte esa
    brecha por el medio.
    """
    mejor, mejor_ratio = None, 0.0
    for opcion in existentes or []:
        r = parecido(valor, opcion)
        if r > mejor_ratio:
            mejor, mejor_ratio = opcion, r
    if mejor is not None and mejor_ratio >= umbral and _plano(mejor) != _plano(valor):
        return mejor
    return None


def revisar(valor: str, existentes: List[str], bloqueadas: Optional[List[str]] = None) -> Tuple[str, Optional[str]]:
    """
    Qué hacer con lo que escribió el cliente.

    Devuelve (veredicto, dato):
        ("ofensivo", None)          -> no se registra
        ("muy_corto", None)         -> una letra no es un color
        ("parecido", "Turquesa")    -> probablemente quiso decir ésa
        ("ok", None)                -> se registra como propuesta
    """
    limpio = (valor or "").strip()
    if len(limpio) < 2:
        return ("muy_corto", None)
    if es_ofensivo(limpio, bloqueadas):
        return ("ofensivo", None)
    igual = sugerencia(limpio, existentes)
    if igual:
        return ("parecido", igual)
    return ("ok", None)
