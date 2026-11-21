"""
El RUT chileno: que el dígito verificador cuadre (módulo 11).

La misma regla que el sitio y el panel (client/src/utils/rut.js), también en el
servidor: un formulario que no la aplique no deja pasar un RUT imposible
(reportado por QA 2026-11-21: la caja no lo validaba). No dice si el RUT
existe ni de quién es; eso solo lo sabe el Registro Civil.
"""

import re
from typing import Optional


def limpiar(rut: Optional[str]) -> str:
    return re.sub(r"[^0-9kK]", "", rut or "").upper()


def digito_verificador(cuerpo: str) -> str:
    suma, factor = 0, 2
    for d in reversed(cuerpo):
        suma += int(d) * factor
        factor = 2 if factor == 7 else factor + 1
    resto = 11 - suma % 11
    return {11: "0", 10: "K"}.get(resto, str(resto))


def motivo_invalido(rut: Optional[str]) -> Optional[str]:
    """None si es válido; si no, por qué, para quien lo escribió."""
    limpio = limpiar(rut)
    if len(limpio) < 8 or len(limpio) > 9:
        return "El RUT debe tener 8 o 9 caracteres, incluyendo el dígito verificador."
    cuerpo, dv = limpio[:-1], limpio[-1]
    if not cuerpo.isdigit():
        return "El RUT solo puede tener números y, al final, un dígito verificador."
    if digito_verificador(cuerpo) != dv:
        return "Revisa el RUT: el dígito verificador no corresponde."
    return None


def validar_opcional(rut: Optional[str]) -> Optional[str]:
    """Para un validador de pydantic: vacío pasa tal cual (quien lo usa decide); inválido, ValueError."""
    if rut is None or not str(rut).strip():
        return rut
    motivo = motivo_invalido(rut)
    if motivo:
        raise ValueError(motivo)
    return rut
