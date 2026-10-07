"""
El precio de una prenda: por cotizar, sin costo o un monto. Nunca un cero ambiguo.

Antes el precio partía en 0, y un 0 decía tres cosas a la vez: que nadie lo
había cotizado, que era un regalo, o que el catálogo tenía un error. En el
comprobante de la clienta salía "$0" por una pieza que todavía no tenía precio.

Ahora:
  None → por cotizar (nadie lo decidió).
  0    → sin costo, y SOLO si alguien lo eligió a propósito.
  > 0  → el monto.
"""

from typing import Optional


def normalizar(precio: Optional[float], sin_costo: bool = False) -> Optional[float]:
    """Lo que se guarda. Un cero o un negativo que nadie marcó como sin costo es "por cotizar"."""
    if sin_costo:
        return 0.0
    if precio is None or precio <= 0:
        return None
    return float(precio)
