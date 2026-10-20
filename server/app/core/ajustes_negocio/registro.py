"""
Qué ajustes del negocio existen, cuánto valen si nadie los ha tocado y qué
valores aceptan.

Un ajuste que no está acá no se puede guardar: así una clave mal escrita desde
el panel no crea un ajuste fantasma que nadie lee.
"""

from typing import Any, Callable, Dict, NamedTuple

from .. import politica_cambios


class Ajuste(NamedTuple):
    defecto: Any
    # Recibe lo que llegó y devuelve el valor limpio, o lanza ValueError con un
    # mensaje para quien lo escribió.
    validar: Callable[[Any], Any]


def _lista_de_opciones(valor: Any) -> list:
    """Una lista de opciones de texto: sin vacías, sin repetidas, al menos una."""
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
        raise ValueError("Tiene que quedar al menos una opción.")
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


def _porcentajes(valor: Any) -> dict:
    if not isinstance(valor, dict):
        raise ValueError("Deben ser los dos porcentajes: bodega y taller.")
    limpios = {}
    for clave, nombre in (("bodega", "si todo sale de bodega"), ("taller", "si algo va al taller")):
        try:
            porcentaje = int(valor.get(clave))
        except (TypeError, ValueError):
            raise ValueError(f"El abono {nombre} tiene que ser un número (un porcentaje).")
        if not 0 <= porcentaje <= 100:
            raise ValueError(f"El abono {nombre} tiene que estar entre 0 y 100%.")
        limpios[clave] = porcentaje
    return limpios


CANALES_PEDIDO = "canales_pedido"
PLAZOS_PEDIDO = "plazos_pedido"
MEDIOS_PAGO = "medios_pago"
ABONO_MINIMO = "abono_minimo"
POLITICA_CAMBIOS = "politica_cambios"

AJUSTES: Dict[str, Ajuste] = {
    # "¿Cómo llegó?" de los pedidos cargados en el panel.
    CANALES_PEDIDO: Ajuste(
        defecto=["WhatsApp", "Instagram", "Facebook", "Llamada", "En la tienda", "Recomendación", "Otro"],
        validar=_lista_de_opciones,
    ),
    # En cuántos días hábiles (lunes a viernes) suele estar listo un pedido:
    # si todo sale de bodega, o si algo lo hace el taller. Con eso se propone
    # la fecha comprometida al confirmar (ver core/pedidos/fecha.py).
    PLAZOS_PEDIDO: Ajuste(
        defecto={"bodega": 2, "taller": 15},
        validar=_plazos,
    ),
    # Cómo se puede pagar un pedido. "Link de pago": Mercado Pago, Webpay,
    # Flow… lo que la clienta paga con tarjeta desde el celular.
    MEDIOS_PAGO: Ajuste(
        defecto=["Efectivo", "Transferencia", "Débito", "Crédito", "Link de pago", "Otro"],
        validar=_lista_de_opciones,
    ),
    # Qué porcentaje del total se pide pagar para confirmar un pedido. Se
    # puede confirmar sin él, con una nota (ver core/pagos/abono.py).
    ABONO_MINIMO: Ajuste(
        defecto={"bodega": 100, "taller": 50},
        validar=_porcentajes,
    ),
    # El plazo para cambios, su unidad y si lo hecho a medida tiene cambio. Se
    # publica en el sitio y sale en el comprobante (core/politica_cambios.py).
    # 15 días: lo que decía la página "Cambios y Devoluciones" al crearlo.
    POLITICA_CAMBIOS: Ajuste(
        defecto={"plazo": 15, "unidad": "dias", "personalizadas_sin_cambio": True},
        validar=politica_cambios.validar,
    ),
}
