"""
El número de un código de barras interno: EAN-13 con prefijo 20.

GS1 reserva los números que empiezan con 2 para uso interno de cada tienda:
así un código nuestro nunca coincide con el de un producto comercial. El 20,
y no otro 2x, porque varios países usan 21-29 para productos de peso
variable (balanzas). Después del prefijo, un correlativo de 10 dígitos (diez
mil millones de variantes), y al final el dígito de control.

El mismo número sirve impreso como CODE128 (las etiquetas de hoy) o como
EAN-13. Si algún día se venden en una cadena que exige códigos oficiales,
se contrata GS1 y se usa su prefijo en vez del 20.
"""

PREFIJO = "20"
LARGO_CORRELATIVO = 10


def digito_control(doce: str) -> int:
    """El dígito 13 de un EAN-13: pesos 1 y 3 alternados desde la izquierda."""
    suma = sum(int(d) * (1 if i % 2 == 0 else 3) for i, d in enumerate(doce))
    return (10 - suma % 10) % 10


def es_ean13_valido(codigo: str) -> bool:
    return len(codigo) == 13 and codigo.isdigit() and digito_control(codigo[:12]) == int(codigo[12])


def codigo_desde(correlativo: int) -> str:
    """El código del correlativo n: 20 + n en diez dígitos + control."""
    if not 0 < correlativo < 10 ** LARGO_CORRELATIVO:
        raise ValueError(f"Correlativo fuera de rango: {correlativo}")
    doce = PREFIJO + str(correlativo).zfill(LARGO_CORRELATIVO)
    return doce + str(digito_control(doce))
