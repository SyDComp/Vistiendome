"""
Lo que la caja puede vender y cómo se encuentra: las variantes libres, el
filtro (características, categorías y palabras), la página de productos del
selector con sus facetas, y la búsqueda del buscador. El servidor filtra y
pagina: con cientos de productos, la caja no descarga todo el catálogo.
"""

from .buscar import buscar
from .cierre import Cierre, cierre, hoy
from .catalogo import Pagina, pagina
from .filtro import Filtro
from .libres import Libre, piezas_libres, variantes_libres

__all__ = ["Cierre", "cierre", "hoy", "Filtro", "Libre", "Pagina", "buscar", "pagina", "piezas_libres", "variantes_libres"]
