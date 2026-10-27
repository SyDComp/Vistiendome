"""
Capítulo 4 del manual: el taller. Las órdenes de corte (lista, detalle, una
nueva) y las piezas únicas de la bodega. Usa la orden N° 1 (el coro y Rosa),
el pedido de Daniela que espera corte y la pieza única N° 1 (del pedido de
Antonia). Nada se guarda: la orden nueva y la asignación se abren sin enviarlas.
"""
from ..escena import Escena
from ..marcas import Marca

ORDENES = "/admin/dashboard/crm/orden-corte"
BODEGA = "/admin/dashboard/inventory/bodega"


def _orden_del_coro(p):
    p.locator("tbody tr", has_text="Coro").first.click()
    p.wait_for_selector(".oc-detalle")
    p.wait_for_timeout(700)


def _por_pedido(p):
    _orden_del_coro(p)
    p.locator(".oc-agrupar button", has_text="Por pedido").click()
    p.wait_for_timeout(500)


def _nueva(p):
    p.get_by_role("button", name="Nueva orden de corte").click()
    p.wait_for_selector(".oc-form")
    p.locator(".oc-bloque >> nth=0").locator("td input").first.check()     # solo en pantalla: no se crea
    p.wait_for_timeout(400)


def _para_stock(p):
    p.get_by_role("button", name="Nueva orden de corte").click()
    p.wait_for_selector(".oc-form")
    p.locator("button.sv-tarjeta", has_text="Vestido Noemi").click()
    p.wait_for_selector(".sv-variante", timeout=20000)
    p.locator(".oc-bloque >> nth=1 >> h3").evaluate("e => e.scrollIntoView({block: 'start'})")
    p.wait_for_timeout(500)


def _asignar(p):
    p.wait_for_selector(".logistics-pieza")
    p.get_by_role("button", name="Agregar a un pedido").first.click()
    p.wait_for_selector(".cfp-tarjeta select option >> nth=1", state="attached")
    p.wait_for_timeout(400)


ESCENAS = [
    Escena("04-01-ordenes", ORDENES, recorte=(".admin-section-header", "table", 'button:has-text("Nueva orden de corte")'), marcas=[
        Marca("main select >> nth=0", 1),
        Marca('button:has-text("Nueva orden de corte")', 2, esquina="arriba-derecha"),
        Marca('tbody tr:has-text("Coro")', 3),
    ]),
    Escena("04-02-detalle", ORDENES, preparar=_orden_del_coro, recorte=".oc-detalle", marcas=[
        Marca(".oc-select", 1),
        Marca('.oc-btn:has-text("Repetir")', 2, esquina="arriba-derecha"),
        Marca('.oc-btn:has-text("Imprimir")', 3, esquina="arriba-derecha"),
        Marca(".oc-notas-vista", 4),
        Marca(".oc-agrupar", 5),
        Marca(".oc-origen >> nth=0", 6, esquina="arriba-derecha"),
    ]),
    Escena("04-03-por-pedido", ORDENES, preparar=_por_pedido, recorte=".oc-detalle", marcas=[
        Marca('.oc-agrupar button:has-text("Por pedido")', 1, esquina="arriba-derecha"),
    ]),
    Escena("04-04-nueva", ORDENES, preparar=_nueva, alto=1100, recorte=".oc-form", marcas=[
        Marca(".oc-bloque >> nth=0", 1),
        Marca(".oc-bloque >> nth=0 >> td.tp-casilla >> nth=0", 2, esquina="abajo-derecha"),
        Marca(".oc-btn-seleccionar-todo", 3, esquina="arriba-derecha"),
        Marca(".oc-bloque >> nth=1", 4),
        Marca(".oc-notas", 5),
        Marca(".oc-btn-primario", 6, esquina="arriba-derecha"),
    ]),
    Escena("04-05-para-stock", ORDENES, preparar=_para_stock, recorte=(".oc-bloque >> nth=1 >> h3", ".sv-variante >> nth=3"), marcas=[
        Marca(".sv-volver", 1, esquina="arriba-derecha"),
        Marca(".sv-filtros", 2),
        Marca(".sv-buscador", 3),
        Marca(".sv-mas >> nth=0", 4, esquina="arriba-derecha"),
    ]),
    Escena("04-06-piezas", BODEGA, preparar=lambda p: p.wait_for_selector(".logistics-pieza"), recorte=".logistics-piezas", marcas=[
        Marca(".logistics-pieza-datos >> nth=0", 1),
        Marca(".logistics-pieza >> nth=0 >> .logistics-stock-badge", 2, esquina="arriba-derecha"),
        Marca('button:has-text("Agregar a un pedido") >> nth=0', 3),
        Marca('.logistics-pieza >> nth=0 >> button:has-text("Dar de baja")', 4, esquina="arriba-derecha"),
    ]),
    Escena("04-07-asignar", BODEGA, preparar=_asignar, recorte=".cfp-tarjeta", marcas=[
        Marca(".cfp-tarjeta select", 1),
        Marca(".sp-precio-opciones", 2),
        Marca(".cfp-pie .sp-boton--principal", 3, esquina="arriba-derecha"),
    ]),
]
