"""
La política de cambios de la tienda: un dato, no un texto.

Antes el plazo vivía escrito dentro de un párrafo libre de la página "Cambios
y Devoluciones". Leer un número de un párrafo es frágil: si se reescribe la
frase, quien lo use dice algo equivocado sin que nadie se entere. Ahora es un
ajuste (Ajustes del negocio): el plazo, su unidad y si lo hecho a medida tiene
cambio. Lo usan el sitio (un bloque fijo de esa página) y el comprobante de la
caja, así nunca dicen cosas distintas (decisión del usuario 2026-10-20).

Cada pedido guarda la política que valía al entregarse (`politica_cambios`):
un comprobante reimpreso dice lo que se le prometió a esa clienta, aunque
después la tienda la haya cambiado.
"""

from typing import Any

UNIDADES = {
    "dias": ("día", "días"),
    "semanas": ("semana", "semanas"),
    "meses": ("mes", "meses"),
}


def validar(valor: Any) -> dict:
    if not isinstance(valor, dict):
        raise ValueError("La política de cambios es un plazo, su unidad y si lo hecho a medida tiene cambio.")
    try:
        plazo = int(valor.get("plazo"))
    except (TypeError, ValueError):
        raise ValueError("El plazo para cambios tiene que ser un número.")
    if not 0 <= plazo <= 365:
        raise ValueError("El plazo para cambios tiene que estar entre 0 y 365.")
    unidad = valor.get("unidad")
    if unidad not in UNIDADES:
        raise ValueError(f"La unidad tiene que ser una de: {', '.join(UNIDADES)}.")
    return {
        "plazo": plazo,
        "unidad": unidad,
        "personalizadas_sin_cambio": bool(valor.get("personalizadas_sin_cambio")),
    }


def texto_plazo(politica: dict) -> str:
    """"15 días", "1 mes"."""
    singular, plural = UNIDADES[politica["unidad"]]
    return f"{politica['plazo']} {singular if politica['plazo'] == 1 else plural}"
