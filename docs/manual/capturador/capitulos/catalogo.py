"""
Capítulo 5 del manual: catálogo y bodega. Productos, el generador de
variantes, variantes, categorías, características, la bodega y las
etiquetas.

El catálogo es REAL: aquí solo se abren pantallas y formularios, se filtra y
se marca en pantalla. Nada se guarda: no se aprietan Guardar, Confirmar
Lote, Confirmar Movimiento ni las flechas de orden de las características.
"""
import re

from ..escena import Escena
from ..marcas import Marca

INV = "/admin/dashboard/inventory"
NOEMI = 'tr:has-text("Vestido Noemi")'


def _editar_noemi(p):
    p.locator(NOEMI).locator("td >> nth=-1").locator("button, a").nth(1).click()
    p.wait_for_selector(".adm-cargando-vista", state="detached", timeout=30000)
    p.wait_for_timeout(900)


def _generador(p, paso):
    """El generador de variantes, en el paso dado, con talla M y L, y color negro y lila."""
    _editar_noemi(p)
    p.locator(".product-hub-btn-add").click()
    p.wait_for_selector(".variant-picker-attr-card")
    for c in ("TALLA", "COLOR"):
        p.locator(".variant-picker-attr-card", has_text=c).click()
    if paso >= 2:
        p.get_by_role("button", name="Siguiente Paso").click()
        p.wait_for_selector(".variant-picker-option-btn")
        for o in ("M", "L", "Negro", "Lila"):
            p.locator(".variant-picker-option-btn", has_text=re.compile(rf"^{o}$")).first.click()
    if paso >= 3:
        p.get_by_role("button", name="Generar Workspace").click()      # solo arma la tabla, no guarda
        p.wait_for_selector(".variant-picker-price-input")
    p.wait_for_timeout(600)


def _bodega_noemi(p):
    p.locator("input[placeholder^='Buscar por SKU']").fill("noemi")
    p.wait_for_timeout(500)
    p.locator("select", has=p.locator("option", has_text="Azul Rey")).first.select_option(label="Azul Rey")
    p.wait_for_selector('tbody tr:has-text("SOF-12-34")')
    p.wait_for_timeout(600)


def _fila_12(p):
    return p.locator('tbody tr:has-text("SOF-12-34")').first


def _ajuste(p):
    _bodega_noemi(p)
    _fila_12(p).locator("button").nth(1).click()
    p.wait_for_selector(".logistics-modal-content")
    p.wait_for_timeout(500)


def _kardex(p):
    _bodega_noemi(p)
    _fila_12(p).locator("button").nth(0).click()
    p.wait_for_selector(".logistics-history-item")
    p.wait_for_timeout(600)


def _elegidas(p):
    """Noemi azul rey con 10 o menos disponibles, ordenadas, y tres elegidas."""
    _bodega_noemi(p)
    p.get_by_role("radio", name="Hasta…").click()
    p.locator(".lote-filtro-numero").fill("10")
    p.get_by_role("button", name="Ordenar por Disponible").click()
    for i in range(3):
        p.locator(f"tbody tr >> nth={i} >> input[type=checkbox]").check()
    p.wait_for_timeout(500)


def _en_bloque(modo):
    """El panel del movimiento en bloque, lleno pero sin confirmar."""
    def preparar(p):
        _elegidas(p)
        p.locator(".lote-barra-mover").click()
        p.wait_for_selector(".lote-modal")
        if modo == "conteo":
            p.get_by_role("tab", name="Conteo").click()
            p.locator(".lote-conteo input >> nth=0").fill("8")
            p.locator("#lote-motivo").fill("Inventario de fin de mes")
        else:
            p.locator("#lote-cantidad").fill("2")
            p.locator("#lote-motivo").fill("Llegó la partida del taller")
        p.wait_for_timeout(400)
    return preparar


def _etiquetas(p):
    p.locator(".barcode-printer-product-row", has_text="Vestido Noemi").click()
    p.wait_for_selector(".barcode-printer-variant-row")
    for i in range(3):
        p.locator(".barcode-printer-variant-row").nth(i).click()
    p.wait_for_timeout(1500)


ESCENAS = [
    Escena("05-01-productos", f"{INV}/products", recorte=(".admin-content-inner h2", "table"), marcas=[
        Marca('button:has-text("Nuevo Producto")', 1),
        Marca('button:has-text("Nueva Variante")', 2, esquina="arriba-derecha"),
        Marca(".adm-buscador-campo", 3),
        Marca(f"{NOEMI} >> td >> nth=4", 4),
        Marca(f"{NOEMI} >> td >> nth=-1", 5, esquina="arriba-derecha"),
    ]),
    Escena("05-02-producto", f"{INV}/products", preparar=_editar_noemi, alto=1350,
           recorte=".admin-inventory-form-container", marcas=[
        Marca(".premium-input >> nth=0", 1),
        Marca(".product-form-textarea", 2),
        Marca(".product-form-select >> nth=0", 3),
        Marca(".product-form-select >> nth=1", 4),
        Marca(".product-gallery-title", 5),
        Marca(".product-carousel-speed-select.adm-ancho-caja", 6),
        Marca(".product-hub-btn-add", 7),
        Marca(".product-hub-btn-lib", 8, esquina="arriba-derecha"),
        Marca('button:has-text("GUARDAR CAMBIOS")', 9),
    ]),
    Escena("05-03-generador-1", f"{INV}/products", preparar=lambda p: _generador(p, 1), recorte=".variant-picker-modal", marcas=[
        Marca(".variant-picker-spec-btn", 1),
        Marca(".variant-picker-search-input", 2),
        Marca('.variant-picker-attr-card:has-text("TALLA")', 3),
        Marca('button:has-text("Siguiente Paso")', 4, esquina="arriba-derecha"),
    ]),
    Escena("05-04-generador-2", f"{INV}/products", preparar=lambda p: _generador(p, 2), recorte=".variant-picker-modal", marcas=[
        Marca(".variant-picker-option-btn >> nth=4", 1),
        Marca(".variant-picker-btn-lib >> nth=0", 2, esquina="arriba-derecha"),
        Marca('button:has-text("Generar Workspace")', 3, esquina="arriba-derecha"),
    ]),
    Escena("05-05-generador-3", f"{INV}/products", preparar=lambda p: _generador(p, 3), recorte=".variant-picker-modal", marcas=[
        Marca('.variant-picker-helpers-btn:has-text("Seleccionar Todo")', 1),
        Marca(".variant-picker-helpers-attr-val >> nth=0", 2, esquina="arriba-derecha"),
        Marca("th.variant-picker-th.sku", 3),
        Marca(".variant-picker-price-input >> nth=0", 4, esquina="arriba-derecha"),
        Marca(".variant-picker-footer-label >> nth=1", 5),
        Marca(".variant-picker-footer-btn-confirm", 6, esquina="arriba-derecha"),
    ]),
    Escena("05-06-variantes", f"{INV}/variants", recorte=(".admin-content-inner h2", "tbody tr >> nth=3"), marcas=[
        Marca(".adm-buscador-campo", 1),
        Marca("select.adm-filtro >> nth=1", 2),
        Marca("tbody tr >> nth=0 >> .sku-barcode-btn", 3, forma="circulo"),
        Marca("tbody tr >> nth=0 >> td >> nth=-1", 4, esquina="arriba-derecha"),
        Marca('button:has-text("Nueva Variante")', 5, esquina="arriba-derecha"),
    ]),
    Escena("05-07-categorias", f"{INV}/categories", alto=1100, recorte=(".admin-content-inner h2", 'tr:has-text("Abrigos")'), marcas=[
        Marca('button:has-text("Nueva Categoría")', 1, esquina="arriba-derecha"),
        Marca('tr:has-text("vestimenta-abrigos") >> td >> nth=1', 2),
        Marca('tr:has-text("vestimenta-abrigos") >> td >> nth=2', 3),
        Marca('tr:has-text("vestimenta-abrigos") >> td >> nth=3', 4),
        Marca('tr:has-text("accesorios-billeteras") >> td >> nth=3', 5),
        Marca('tr:has-text("accesorios-billeteras") >> td >> nth=6', 6),
    ]),
    Escena("05-08-caracteristicas", f"{INV}/characteristics", recorte=(".admin-content-inner h2", "tbody tr >> nth=-1"), marcas=[
        Marca("tbody tr >> nth=3 >> td >> nth=0", 1),
        Marca("tbody tr >> nth=3 >> td >> nth=2", 2),
        Marca("tbody tr >> nth=1 >> td >> nth=3", 3),
        Marca("tbody tr >> nth=1 >> td >> nth=4", 4),
        Marca("tbody tr >> nth=1 >> td >> nth=5", 5),
        Marca('button:has-text("Nueva Característica")', 6, esquina="arriba-derecha"),
    ]),
    Escena("05-09-bodega", f"{INV}/bodega", preparar=_bodega_noemi,
           recorte=("input[placeholder^='Buscar por SKU']", "tbody tr >> nth=4"), marcas=[
        Marca("input[placeholder^='Buscar por SKU']", 1),
        Marca('select:has(option:text-is("Azul Rey"))', 2),
        Marca('th:has-text("En bodega")', 3),
        Marca('th:has-text("Apartado")', 4),
        Marca('th:has-text("Disponible")', 5, esquina="arriba-derecha"),
        Marca('tbody tr >> nth=0 >> button >> nth=0', 6, forma="circulo"),
        Marca('tbody tr >> nth=0 >> button >> nth=1', 7, forma="circulo"),
    ]),
    Escena("05-10-ajuste", f"{INV}/bodega", preparar=_ajuste, recorte=".logistics-modal-content", marcas=[
        Marca(".logistics-type-btns", 1),
        Marca(".logistics-modal-input", 2),
        Marca(".logistics-modal-resultado", 3),
        Marca(".logistics-modal-textarea", 4),
        Marca(".logistics-modal-btn-confirm", 5, esquina="arriba-derecha"),
    ]),
    Escena("05-11-historial", f"{INV}/bodega", preparar=_kardex, recorte=(".panel-lateral-cabecera", ".logistics-history-list"), marcas=[
        Marca(".logistics-drawer-stock", 1),
        Marca(".logistics-history-item >> nth=0", 2),
        Marca(".logistics-history-item >> nth=0 >> .logistics-history-note", 3, esquina="abajo-izquierda"),
    ]),
    Escena("05-13-elegir", f"{INV}/bodega", preparar=_elegidas, recorte=(".lote-filtro", ".lote-barra"), marcas=[
        Marca(".lote-filtro", 1),
        Marca(".lote-ordenable:has-text('Disponible')", 2, esquina="arriba-derecha"),
        Marca("thead input[type=checkbox]", 3, forma="circulo"),
        Marca("tbody tr >> nth=0 >> input[type=checkbox]", 4, forma="circulo"),
        Marca(".lote-barra-mover", 5, esquina="arriba-derecha"),
    ]),
    Escena("05-14-sumar", f"{INV}/bodega", preparar=_en_bloque("sumar"), recorte=".lote-modal", marcas=[
        Marca(".lote-modos", 1),
        Marca(".lote-modal .logistics-type-btns", 2),
        Marca("#lote-cantidad", 3),
        Marca("#lote-motivo", 4),
        Marca(".lote-modal .logistics-modal-btn-confirm", 5, esquina="arriba-derecha"),
    ]),
    Escena("05-15-conteo", f"{INV}/bodega", preparar=_en_bloque("conteo"), recorte=".lote-modal", marcas=[
        Marca(".lote-conteo-fila--cabecera", 1),
        Marca(".lote-conteo input >> nth=0", 2),
        Marca(".lote-conteo-fila >> nth=1 >> em", 3, forma="circulo"),
        Marca(".lote-modal .logistics-modal-btn-confirm", 4, esquina="arriba-derecha"),
    ]),
    Escena("05-12-etiquetas", f"{INV}/barcodes", preparar=_etiquetas, recorte=".barcode-printer-container", marcas=[
        Marca(".barcode-printer-variant-row >> nth=0", 1),
        Marca(".barcode-printer-config-group >> nth=0", 2),
        Marca(".barcode-printer-config-group >> nth=1", 3),
        Marca(".barcode-printer-config-group.large", 4),
        Marca(".barcode-printer-config-styles", 5),
        Marca(".barcode-printer-preview-area", 6),
        Marca(".barcode-printer-btn-print", 7, esquina="arriba-derecha"),
    ]),
]
