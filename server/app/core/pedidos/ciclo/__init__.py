"""
El ciclo del pedido: confirmar, apartar en bodega, despachar y volver atrás.

Cada prenda tiene un camino (BODEGA o TALLER) que se decide al confirmar.
"""

from .apartado import Bodega, bodega_de, estado_en_bodega
from .caminos import APARTADA, BODEGA, CAMINOS, ESPERANDO, TALLER
from .confirmar import CambioLaBodega, NoSeConfirma, confirmar, problemas
from .despacho import NoSeDespacha, devolver, sacar
from .listo import Avance, avance
from .propuesta import PrendaPropuesta, proponer
from .transiciones import al_cambiar, por_que_no

__all__ = [
    "Bodega", "bodega_de", "estado_en_bodega",
    "APARTADA", "BODEGA", "CAMINOS", "ESPERANDO", "TALLER",
    "CambioLaBodega", "NoSeConfirma", "confirmar", "problemas",
    "NoSeDespacha", "devolver", "sacar",
    "Avance", "avance",
    "PrendaPropuesta", "proponer",
    "al_cambiar", "por_que_no",
]
