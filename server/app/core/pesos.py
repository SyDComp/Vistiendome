"""
Los montos del catálogo son pesos chilenos: enteros, sin centavos.

Visto 2026-11-24: en la casilla de precio se escribió "52.990" como se escribe
en Chile, el navegador leyó el punto como coma decimal y se guardó 52,99. El
servidor lo aceptó porque cualquier número positivo pasaba, y la tienda mostró
"$52,99". Un monto en pesos con decimales siempre es un error de tipeo: aquí se
rechaza con un mensaje que dice cómo escribirlo.

El porcentaje de una oferta ('percent') no es un monto: ese sí puede tener
decimales (12,5 %).
"""

from typing import Optional

# Ofertas cuyo sale_value es un monto en pesos (ver core/pricing.py).
OFERTAS_EN_PESOS = {"fixed", "amount"}


def _sin_centavos(valor: float, que: str) -> float:
    if valor != int(valor):
        raise ValueError(
            f"{que} {valor:g} tiene decimales, y los pesos no tienen centavos. "
            "Escribe el monto entero: 52.990, no 52,99."
        )
    return valor


def revisar_precio(valor: Optional[float], de: str = "El precio") -> Optional[float]:
    """El precio de una variante: mayor que cero y en pesos enteros. None = no viene."""
    if valor is None:
        return None
    if valor <= 0:
        raise ValueError(f"{de} tiene que ser un monto mayor que cero.")
    return _sin_centavos(valor, de)


def revisar_oferta(tipo: Optional[str], valor: Optional[float]) -> Optional[float]:
    """El valor de una oferta: en pesos enteros cuando es un monto; un % se deja pasar."""
    if valor is None or tipo not in OFERTAS_EN_PESOS:
        return valor
    return _sin_centavos(valor, "El monto de la oferta")
