"""
Qué ajustes del negocio existen, cuánto valen si nadie los ha tocado y qué
valores aceptan.

Un ajuste que no está acá no se puede guardar: así una clave mal escrita desde
el panel no crea un ajuste fantasma que nadie lee.
"""

from typing import Any, Callable, Dict, NamedTuple


class Ajuste(NamedTuple):
    defecto: Any
    # Recibe lo que llegó y devuelve el valor limpio, o lanza ValueError con un
    # mensaje para quien lo escribió.
    validar: Callable[[Any], Any]


def _lista_de_canales(valor: Any) -> list:
    if not isinstance(valor, list):
        raise ValueError("Debe ser una lista de opciones.")
    limpias, vistas = [], set()
    for opcion in valor:
        texto = str(opcion or "").strip()
        if not texto:
            continue
        if len(texto) > 60:
            raise ValueError(f'"{texto[:20]}…" es demasiado largo (máximo 60 caracteres).')
        clave = texto.casefold()
        if clave in vistas:
            raise ValueError(f'"{texto}" está repetida.')
        vistas.add(clave)
        limpias.append(texto)
    if not limpias:
        raise ValueError("Tiene que quedar al menos una opción: se pide al cargar cada pedido.")
    return limpias


CANALES_PEDIDO = "canales_pedido"

AJUSTES: Dict[str, Ajuste] = {
    # "¿Cómo llegó?" de los pedidos cargados en el panel.
    CANALES_PEDIDO: Ajuste(
        defecto=["WhatsApp", "Instagram", "Facebook", "Llamada", "En la tienda", "Recomendación", "Otro"],
        validar=_lista_de_canales,
    ),
}
