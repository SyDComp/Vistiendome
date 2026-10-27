"""
Capítulo 6 del manual: el sitio. La portada y sus bloques, las páginas de
atención al cliente (con la de cambios y devoluciones), las colecciones, y
Redes y Contacto (modal de bienvenida, precios por cantidad, promociones,
barra de anuncio).

El sitio es REAL: aquí solo se abren pantallas y editores. Todo queda en
borrador hasta apretar Guardar, Guardar Colección o Guardar Cambios, y no se
aprietan.
"""
from ..escena import Escena
from ..marcas import Marca

PORTADA = "/admin/dashboard/cms/homepage"
AYUDA = "/admin/dashboard/cms/help"
CONTACTO = "/admin/dashboard/cms/settings"
COLECCIONES = "/admin/dashboard/inventory/collections"


def bloque(titulo):
    return f'.cms-pg-tarjeta:has(h4:text-is("{titulo}"))'


def panel(titulo):
    return f'section.adm-panel:has(h3:has-text("{titulo}"))'


def _editar_bloque(titulo, espera):
    def preparar(p):
        p.locator(bloque(titulo)).locator(".cms-adm-accion--marca").click()
        p.wait_for_selector(espera)
        p.wait_for_timeout(1200)
    return preparar


def _cambios(p):
    p.locator(".adm-tarjeta-fila", has=p.locator('h4:text-is("Cambios y Devoluciones")')).locator(
        "button", has_text="Gestionar Contenido").click()
    p.wait_for_selector(".cms-pg-tarjeta")
    p.wait_for_timeout(1500)


def _editar_coleccion(p):
    p.locator('tr:has-text("productos en oferta")').locator("td >> nth=-1").locator("button").nth(1).click()
    p.wait_for_selector(".coll-manager-form-title")
    p.wait_for_timeout(1200)


def _ver(titulo):
    def preparar(p):
        p.locator(panel(titulo)).evaluate("e => e.scrollIntoView({block: 'start'})")
        p.wait_for_timeout(500)
    return preparar


BIENVENIDA, CANTIDAD, PROMOS, BARRA = (panel(t) for t in (
    "Modal de Bienvenida", "Precios por cantidad", "Promociones", "Barra de Anuncio"))
PRIMERO = ".cms-pg-tarjeta >> nth=0"

ESCENAS = [
    Escena("06-01-portada", PORTADA, recorte=".cms-pg", marcas=[
        Marca(f"{PRIMERO} >> h4", 1),
        Marca(f"{PRIMERO} >> .cms-adm-accion >> nth=0", 2, forma="circulo"),
        Marca(f"{PRIMERO} >> .cms-adm-accion >> nth=1", 3, forma="circulo"),
        Marca(f"{PRIMERO} >> .cms-adm-accion >> nth=2", 4, forma="circulo"),
        Marca(".cms-pg-reordenar", 5),
        Marca(".cms-pg-anadir", 6, esquina="arriba-derecha"),
        Marca(".cms-pg-grupo", 7, esquina="arriba-derecha"),
    ]),
    Escena("06-02-carrusel", PORTADA, preparar=_editar_bloque("Colección tonos rosa", ".detail-drawer-section-wrapper"),
           recorte=".detail-drawer-main-panel", marcas=[
        Marca(".detail-drawer-main-panel input >> nth=2", 1),
        Marca("select.detail-drawer-select", 2),
        Marca(".detail-drawer-btn-primary", 3, esquina="arriba-derecha"),
    ]),
    Escena("06-03-banner", PORTADA, preparar=_editar_bloque("Novias", ".est-pantalla"), marcas=[
        Marca(".est-encogible >> nth=0", 1),
        Marca(".est-pareja", 2),
        Marca('.est-escena', 3, esquina="arriba-derecha"),
        Marca(".est-rotulo--suelto", 4, esquina="arriba-derecha"),
        Marca('.est-pantalla button:has-text("Escritorio")', 5),
        Marca('.est-pantalla button:has-text("PREVIA")', 6),
        Marca('.est-pantalla button:text-is("GUARDAR")', 7, esquina="arriba-derecha"),
    ]),
    Escena("06-04-ayuda", AYUDA, recorte=".cms-adm", marcas=[
        Marca(".adm-tarjeta-fila >> nth=0 >> .cms-adm-accion", 1, forma="circulo"),
        Marca('.adm-tarjeta-fila:has(h4:text-is("Cambios y Devoluciones")) >> .adm-boton-suave', 2, esquina="arriba-derecha"),
        Marca(".cms-pg-reordenar", 3, esquina="arriba-derecha"),
    ]),
    Escena("06-05-cambios", AYUDA, preparar=_cambios, recorte=".cms-pg", marcas=[
        Marca('.cms-pg-tarjeta:has-text("Plazo y condiciones")', 1),
        Marca('.cms-pg-espejo :text("15 días")', 2),
        Marca(".cms-pg-anadir", 3, esquina="arriba-derecha"),
    ]),
    Escena("06-06-colecciones", COLECCIONES, recorte=(".admin-content-inner h2", "table"), marcas=[
        Marca('button:has-text("Nueva Colección")', 1, esquina="arriba-derecha"),
        Marca('tr:has-text("productos en oferta") >> td >> nth=1', 2),
        Marca('tr:has-text("Vestido Debora Lanilla") >> td >> nth=2', 3),
        Marca('tr:has-text("productos en oferta") >> td >> nth=-1', 4, esquina="arriba-derecha"),
    ]),
    Escena("06-07-coleccion", COLECCIONES, preparar=_editar_coleccion, alto=1300, recorte=".admin-content-inner", marcas=[
        Marca(".coll-manager-cover-box", 1),
        Marca(".coll-manager-rec-wrapper", 2),
        Marca(".coll-manager-toggle-wrap", 3, esquina="arriba-derecha"),
        Marca(".coll-manager-sku-item >> nth=0", 4),
        Marca('button:has-text("Gestionar Variantes")', 5),
        Marca('button:has-text("Guardar Colección")', 6, esquina="arriba-derecha"),
    ]),
    Escena("06-08-contacto", CONTACTO, alto=1300, recorte=(".adm-seccion-cabecera", panel("Métodos de Envío")), marcas=[
        Marca("input[name=facebook]", 1),
        Marca("input[name=whatsapp]", 2),
        Marca("input[name=phone_display]", 3),
        Marca("textarea[name=address]", 4),
        Marca(".adm-fila-envuelta--junta", 5),
        Marca(".adm-boton-marca-alto", 6, esquina="arriba-derecha"),
    ]),
    Escena("06-09-bienvenida", CONTACTO, preparar=_ver("Modal de Bienvenida"), alto=1300, recorte=BIENVENIDA, marcas=[
        Marca(f"{BIENVENIDA} >> label.adm-elegible", 1),
        Marca(f"{BIENVENIDA} >> select >> nth=0", 2),
        Marca(f"{BIENVENIDA} >> input[type=text] >> nth=0", 3, esquina="arriba-derecha"),
        Marca(f"{BIENVENIDA} >> textarea", 4),
        Marca(f"{BIENVENIDA} >> .adm-ancho-total >> nth=1", 5),
        Marca(f'{BIENVENIDA} >> input[placeholder="Ej: Ver colección"]', 6),
        Marca(f"{BIENVENIDA} >> .adm-bloque-separado", 7),
    ]),
    Escena("06-10-por-cantidad", CONTACTO, preparar=_ver("Precios por cantidad"), alto=1300, recorte=CANTIDAD, marcas=[
        Marca(f"{CANTIDAD} >> .adm-tarjeta-interna >> nth=0 >> select >> nth=0", 1),
        Marca(f"{CANTIDAD} >> .adm-tarjeta-interna >> nth=0 >> select >> nth=1", 2),
        Marca(f"{CANTIDAD} >> .adm-tarjeta-interna >> nth=0 >> input[type=number] >> nth=0", 3),
        Marca(f"{CANTIDAD} >> .adm-tarjeta-interna >> nth=0 >> select >> nth=3", 4),
        Marca(f"{CANTIDAD} >> .adm-boton-oscuro", 5),
    ]),
    Escena("06-11-promociones", CONTACTO, preparar=_ver("Promociones"), alto=1300, recorte=PROMOS, marcas=[
        Marca(f"{PROMOS} >> .adm-tarjeta-interna >> nth=0 >> select", 1),
        Marca(f"{PROMOS} >> .adm-tarjeta-interna >> nth=1 >> input[type=number] >> nth=0", 2),
        Marca(f"{PROMOS} >> .adm-tarjeta-interna >> nth=1 >> input[type=date] >> nth=0", 3),
        Marca(f"{PROMOS} >> .adm-tarjeta-interna >> nth=1 >> .adm-etiquetas", 4),
        Marca(f"{PROMOS} >> .adm-tarjeta-interna >> nth=1 >> label.adm-elegible--arriba", 5),
        Marca(f"{PROMOS} >> .adm-tarjeta-interna >> nth=1 >> .adm-acciones-tarjeta >> button >> nth=0", 6),
        Marca(f"{PROMOS} >> .adm-boton-rosa", 7),
    ]),
    Escena("06-12-barra", CONTACTO, preparar=_ver("Barra de Anuncio"), alto=1300, recorte=BARRA, marcas=[
        Marca(f"{BARRA} >> label.adm-elegible >> nth=0", 1),
        Marca(f"{BARRA} >> input[type=text] >> nth=0", 2),
        Marca(f"{BARRA} >> .adm-rejilla--holgada >> .input-group >> nth=0", 3),
        Marca(f"{BARRA} >> .adm-rejilla--holgada >> .input-group >> nth=2", 4, esquina="arriba-derecha"),
        Marca(f"{BARRA} >> .adm-fila-envuelta", 5),
        Marca(f"{BARRA} >> label.adm-elegible--junta", 6),
    ]),
]
