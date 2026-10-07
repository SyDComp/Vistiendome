"""Ajustes del negocio: privados, editables desde el panel."""

from .almacen import guardar, leer, leer_todos
from .registro import AJUSTES, CANALES_PEDIDO

__all__ = ["AJUSTES", "CANALES_PEDIDO", "guardar", "leer", "leer_todos"]
