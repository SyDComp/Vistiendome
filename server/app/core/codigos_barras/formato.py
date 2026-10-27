"""
Un código de barras escrito a mano (el de un proveedor, por ejemplo). Si
tiene forma de EAN-13 (13 dígitos), su dígito de control tiene que cuadrar:
si no, ningún lector lo leería impreso como EAN-13. Otros formatos se
aceptan tal cual.
"""

from typing import Optional

from .numero import digito_control, es_ean13_valido


class CodigoInvalido(ValueError):
    pass


def revisar(codigo: Optional[str]) -> Optional[str]:
    """El código limpio, o None si viene vacío. Lanza si es un EAN-13 que no cuadra."""
    limpio = (codigo or "").strip()
    if not limpio:
        return None
    if len(limpio) == 13 and limpio.isdigit() and not es_ean13_valido(limpio):
        raise CodigoInvalido(
            f"El código {limpio} no es un EAN-13 válido: su último dígito debería ser "
            f"{digito_control(limpio[:12])}."
        )
    return limpio
