"""Las escenas de cada capítulo del manual, por nombre."""
from . import caja, inicio, pedidos, taller

CAPITULOS = {
    "inicio": inicio.ESCENAS,
    "caja": caja.ESCENAS,
    "pedidos": pedidos.ESCENAS,
    "taller": taller.ESCENAS,
}
