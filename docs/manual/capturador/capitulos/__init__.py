"""Las escenas de cada capítulo del manual, por nombre."""
from . import ajustes, caja, catalogo, estadisticas, inicio, pedidos, sitio, taller

CAPITULOS = {
    "inicio": inicio.ESCENAS,
    "caja": caja.ESCENAS,
    "pedidos": pedidos.ESCENAS,
    "taller": taller.ESCENAS,
    "catalogo": catalogo.ESCENAS,
    "sitio": sitio.ESCENAS,
    "ajustes": ajustes.ESCENAS,
    "estadisticas": estadisticas.ESCENAS,
}
