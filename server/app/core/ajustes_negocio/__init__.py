"""Ajustes del negocio: privados, editables desde el panel."""

from .almacen import guardar, leer, leer_todos
from .registro import ABONO_MINIMO, AJUSTES, CANALES_PEDIDO, MEDIOS_PAGO, PLAZOS_PEDIDO, POLITICA_CAMBIOS

__all__ = ["ABONO_MINIMO", "AJUSTES","CANALES_PEDIDO", "MEDIOS_PAGO", "PLAZOS_PEDIDO", "POLITICA_CAMBIOS","guardar", "leer", "leer_todos"]
