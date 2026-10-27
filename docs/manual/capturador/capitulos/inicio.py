"""
Capítulo 1 del manual: primeros pasos. Una pantalla del panel con lo que
está en todas: el menú, la caja, los estados de un pedido y cerrar sesión.
"""
from ..escena import Escena
from ..marcas import Marca

ESCENAS = [
    Escena("01-panel", "/admin/dashboard/crm/cotizaciones", marcas=[
        Marca(".admin-sidebar-nav", 1),
        Marca('button.cotv-accion:has-text("Caja")', 2),
        Marca(".cot-glosario", 3),
        Marca('.admin-sidebar button:has-text("Cerrar Sesión")', 4),
    ]),
]
