"""
La referencia que comparten los movimientos de un mismo lote: así el historial
de cada variante deja ver qué entró o se corrigió junto.
"""

from uuid import uuid4


def nueva_referencia() -> str:
    return f"lote-{uuid4().hex[:10]}"
