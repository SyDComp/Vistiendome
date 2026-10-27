"""
Por qué no se puede registrar un lote. Un lote es todo o nada (decisión del
usuario 2026-10-27): si una sola variante lo impide, no se escribe ninguna, y
el rechazo dice cuáles y por qué para que la pantalla las muestre.
"""

from typing import List, Optional


class LoteInvalido(ValueError):
    """El lote está mal pedido: vacío, demasiado grande, sin motivo, variantes repetidas o inexistentes."""


class LoteRechazado(Exception):
    """El lote está bien pedido, pero la bodega no lo permite tal como está."""

    def __init__(self, mensaje: str, filas: Optional[List[dict]] = None):
        super().__init__(mensaje)
        self.mensaje = mensaje
        self.filas = filas or []
