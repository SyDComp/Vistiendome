"""
El ciclo del pedido: confirmar, apartar en bodega, despachar y volver atrás.

Cada prenda tiene un camino (BODEGA o TALLER) que se decide al confirmar.
"""

from .apartado import Bodega, bodega_de, estado_en_bodega
from .caminos import APARTADA, BODEGA, CAMINOS, ESPERANDO, TALLER
from .confirmar import CambioLaBodega, NoSeConfirma, abono_de, confirmar, problemas
from .despacho import NoSeDespacha, devolver, sacar
from .listo import Avance, avance
from .propuesta import PrendaPropuesta, proponer
from .tarea import BUSCAR, HACER, marcar, tarea_de, terminada
from .transiciones import al_cambiar, por_que_no

__all__ = [
    "Bodega", "bodega_de", "estado_en_bodega",
    "APARTADA", "BODEGA", "CAMINOS", "ESPERANDO", "TALLER",
    "CambioLaBodega", "NoSeConfirma", "abono_de", "confirmar", "problemas",
    "NoSeDespacha", "devolver", "sacar",
    "Avance", "avance",
    "PrendaPropuesta", "proponer",
    "BUSCAR", "HACER", "marcar", "tarea_de", "terminada",
    "al_cambiar", "por_que_no",
]
