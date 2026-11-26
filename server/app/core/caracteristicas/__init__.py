"""
Las características (Talla, Color, Cuello…): sus opciones, cómo se enlazan a
cada variante y en qué orden se muestran.
"""

from .enlaces import Biblioteca, OpcionInexistente, asignar, biblioteca, resolver
from .nombres import normalize_char, normalize_opt
from .opciones import OpcionDelSistema, OpcionesInvalidas, sincronizar, usos, usos_de_caracteristica
from .orden import NoSeReordena, en_orden, reordenar, siguiente_orden
from .prendas import separar, vestir

__all__ = [
    "Biblioteca", "OpcionInexistente", "asignar", "biblioteca", "resolver",
    "normalize_char", "normalize_opt",
    "OpcionDelSistema", "OpcionesInvalidas", "sincronizar", "usos", "usos_de_caracteristica",
    "NoSeReordena", "en_orden", "reordenar", "siguiente_orden",
    "separar", "vestir",
]
