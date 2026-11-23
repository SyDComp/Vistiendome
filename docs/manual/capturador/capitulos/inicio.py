"""
Capítulo 1 del manual: primeros pasos. Una pantalla del panel con lo que
está en todas: el menú, la caja, los estados de un pedido y cerrar sesión.
"""
from ..escena import Escena
from ..marcas import Marca

def _clave(p):
    p.wait_for_selector('input[name="actual"]')
    p.locator('input[name="actual"]').scroll_into_view_if_needed()
    p.wait_for_timeout(400)


ESCENAS = [
    Escena("01-panel", "/admin/dashboard/crm/cotizaciones", marcas=[
        Marca(".admin-sidebar-nav", 1),
        Marca('button.cotv-accion:has-text("Caja")', 2),
        Marca(".cot-glosario", 3),
        Marca('.admin-sidebar button:has-text("Cerrar Sesión")', 4),
    ]),
    Escena("01-02-clave", "/admin/dashboard/profile", preparar=_clave,
           recorte=('.admin-form-container:has(input[name="actual"]) .admin-form-header',
                    'form:has(input[name="actual"]) button[type="submit"]'), marcas=[
        Marca('input[name="actual"]', 1),
        Marca('.adm-fila-amplia:has(input[name="nueva"])', 2),
        Marca('form:has(input[name="actual"]) button[type="submit"]', 3, esquina="arriba-derecha"),
    ]),
]
