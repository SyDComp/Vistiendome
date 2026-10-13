"""Ajustes del negocio: privados, editables desde el panel."""

from .almacen import guardar, leer, leer_todos
from .registro import ABONO_MINIMO, AJUSTES, CANALES_PEDIDO, MEDIOS_PAGO, PLAZOS_PEDIDO

__all__ = ["ABONO_MINIMO", "AJUSTES","CANALES_PEDIDO", "MEDIOS_PAGO", "PLAZOS_PEDIDO","guardar", "leer", "leer_todos"]
