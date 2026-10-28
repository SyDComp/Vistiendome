"""
Qué hace el taller con una prenda de un pedido: hacerla o ir a buscarla.

La orden de corte es la hoja de trabajo del taller: ahí van las dos. Lo que
el taller hace se lee del camino que se eligió al confirmar, no se guarda
aparte en la orden (así no hay dos datos que puedan contradecirse):

  BODEGA  BUSCAR  ya existe: ir a buscarla. Al terminar queda encontrada;
                  no mueve stock (sale de bodega cuando sale el pedido).
  TALLER  HACER   se confecciona. Al terminar queda cortada.

En la caja no hay nada de esto: quien vende saca la prenda del perchero.
"""

from ....models.crm import CotizacionItem
from .caminos import BODEGA

HACER = "HACER"
BUSCAR = "BUSCAR"


def tarea_de(item: CotizacionItem) -> str:
    return BUSCAR if item.camino == BODEGA else HACER


def terminada(item: CotizacionItem) -> bool:
    """El taller ya la tiene en la mano: hecha o encontrada."""
    return item.encontrada if tarea_de(item) == BUSCAR else item.cortado


def marcar(item: CotizacionItem, hecho: bool) -> None:
    """Al finalizar una orden (o reabrirla). No hace add ni commit."""
    if tarea_de(item) == BUSCAR:
        item.encontrada = hecho
    else:
        item.cortado = hecho
