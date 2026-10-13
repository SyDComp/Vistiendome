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


def _plazos(valor: Any) -> dict:
    if not isinstance(valor, dict):
        raise ValueError("Deben ser los dos plazos: bodega y taller.")
    limpios = {}
    for clave, nombre in (("bodega", "de bodega"), ("taller", "del taller")):
        try:
            dias = int(valor.get(clave))
        except (TypeError, ValueError):
            raise ValueError(f"El plazo {nombre} tiene que ser un número de días.")
        if not 0 <= dias <= 365:
            raise ValueError(f"El plazo {nombre} tiene que estar entre 0 y 365 días hábiles.")
        limpios[clave] = dias
    return limpios


CANALES_PEDIDO = "canales_pedido"
PLAZOS_PEDIDO = "plazos_pedido"

AJUSTES: Dict[str, Ajuste] = {
    # "¿Cómo llegó?" de los pedidos cargados en el panel.
    CANALES_PEDIDO: Ajuste(
        defecto=["WhatsApp", "Instagram", "Facebook", "Llamada", "En la tienda", "Recomendación", "Otro"],
        validar=_lista_de_canales,
    ),
    # En cuántos días hábiles (lunes a viernes) suele estar listo un pedido:
    # si todo sale de bodega, o si algo lo hace el taller. Con eso se propone
    # la fecha comprometida al confirmar (ver core/pedidos/fecha.py).
    PLAZOS_PEDIDO: Ajuste(
        defecto={"bodega": 2, "taller": 15},
        validar=_plazos,
    ),
}
