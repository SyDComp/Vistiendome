"""
Capítulo 5 del manual, Producción: cambiar el precio de muchas variantes de
un producto a la vez (el editor en lote).

Se toman en el entorno local de prueba (MANUAL_SITIO=http://localhost:5187),
con el Tapado Magdalena Invierno. Se elige, se escribe y se aplica en
pantalla, pero nunca se aprieta Guardar Cambios.
"""
from ..escena import Escena
from ..marcas import Marca

PRODUCCION = "/admin/dashboard/workspace"
PRODUCTO = "Tapado Magdalena Invierno"
COLOR = "Rojo Italiano"
CHIP = f'.batch-editor-filter-btn:has-text("{COLOR}")'
ELEGIDA = "tr.batch-editor-tr.selected"


def _abrir(p):
    p.locator(".workspace-search-input").fill("tapado")
    p.locator(".workspace-result-item", has_text=PRODUCTO).click()
    p.wait_for_selector(".batch-editor-table")
    p.wait_for_timeout(600)


def _elegir(p):
    """Las variantes de un color elegidas y el precio escrito, todavía sin aplicar."""
    _abrir(p)
    p.locator(CHIP).click()
    p.locator(".batch-editor-price-input").fill("21.990")
    p.wait_for_timeout(500)


def _aplicado(p):
    """El precio ya aplicado en la tabla, con las acciones rápidas cerradas para que se vea el botón de guardar."""
    _elegir(p)
    p.locator(".batch-editor-btn-apply").click()
    p.get_by_text("Acciones Rápidas de Selección").click()
    p.locator(".batch-editor-view-btn", has_text="Seleccionados").click()
    p.wait_for_timeout(600)


ESCENAS = [
    Escena("05-17-produccion", PRODUCCION, recorte=(".workspace-title", ".workspace-result-item >> nth=3"), marcas=[
        Marca(".workspace-search-input", 1),
        Marca(f'.workspace-result-item:has-text("{PRODUCTO}")', 2),
    ]),
    Escena("05-18-elegir", PRODUCCION, preparar=_elegir, alto=1200,
           recorte=(".batch-editor-master-accordion", ".batch-editor-floating-bar"), marcas=[
        Marca(".batch-editor-accordion-actions", 1, esquina="arriba-derecha"),
        Marca(CHIP, 2),
        Marca(".batch-editor-selection-count", 3, esquina="arriba-derecha"),
        Marca(".batch-editor-price-input", 4),
        Marca(".batch-editor-btn-apply", 5, esquina="arriba-derecha"),
    ]),
    Escena("05-19-guardar", PRODUCCION, preparar=_aplicado, alto=1200,
           recorte=(".batch-editor-header", ".batch-editor-table"), marcas=[
        Marca(".batch-editor-view-filters", 1),
        Marca(f"{ELEGIDA} >> nth=0 >> .batch-editor-price-input-table", 2, esquina="arriba-derecha"),
        Marca(".batch-editor-save-btn", 3, esquina="arriba-derecha"),
    ]),
]
