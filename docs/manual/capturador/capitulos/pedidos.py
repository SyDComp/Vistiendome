"""
Capítulo 3 del manual: los pedidos. La lista, crear uno a mano y el detalle
de un pedido, sección por sección. Se usan los pedidos de demostración:
N° 1 (nuevo), N° 2 (al taller, con abono), N° 3 (listo para retirar) y
N° 5 (el coro, con orden de corte). Nada se guarda: los formularios se
abren y se capturan sin enviarlos.
"""
import re

from ..escena import Escena
from ..marcas import Marca

PEDIDOS = "/admin/dashboard/crm/cotizaciones"
CORO = 'tr:has-text("Coro Iglesia")'


def seccion(titulo):
    return f'.detail-drawer-section-wrapper:has(h3:has-text("{titulo}"))'


def _abrir(p, numero):
    """El detalle del pedido, con el ojo de su fila."""
    fila = p.locator("tr").filter(has=p.locator(".adm-celda--pegada", has_text=re.compile(rf"N° {numero}$")))
    fila.first.locator(".adm-acciones-fila button").nth(1).click()
    p.wait_for_selector(".detail-drawer-main-panel")
    p.wait_for_timeout(900)


def _mostrar(p, selector):
    p.locator(selector).first.evaluate("e => e.scrollIntoView({block: 'center'})")
    p.wait_for_timeout(400)


def _en_seccion(numero, titulo, boton=None):
    def preparar(p):
        _abrir(p, numero)
        if boton:
            p.locator(seccion(titulo)).get_by_role("button", name=boton).click()
            p.wait_for_timeout(700)
        _mostrar(p, seccion(titulo))
    return preparar


def _nuevo(p):
    p.get_by_role("button", name="Nueva Cotización Manual").click()
    p.wait_for_selector(".cot-tarjeta")
    p.locator(".cot-tarjeta input").first.fill("Camila")
    p.wait_for_timeout(900)


def _confirmar(p):
    _abrir(p, 1)
    p.get_by_role("button", name="Confirmar pedido…").click()
    p.wait_for_selector(".cfp-tarjeta")
    p.wait_for_timeout(900)


def _impresiones(p):
    _abrir(p, 3)
    _mostrar(p, ".dd-bloque-destacado")


ESCENAS = [
    Escena("03-01-lista", PEDIDOS, alto=1300, recorte=(".adm-vista-cabecera", ".adm-tabla-caja"), marcas=[
        Marca('button.cotv-accion:has-text("Nueva Cotización")', 1),
        Marca(".adm-buscador-campo", 2),
        Marca(f"{CORO} select", 3),
        Marca(f"{CORO} .cotv-pago", 4),
        Marca(f"{CORO} .cotv-fecha", 5),
        Marca(f"{CORO} .cotv-enlace", 6),
        Marca(f"{CORO} .adm-acciones-fila", 7, esquina="arriba-derecha"),
    ]),
    Escena("03-02-nuevo", PEDIDOS, preparar=_nuevo, recorte=".cot-tarjeta", marcas=[
        Marca(".cot-alternador", 1, esquina="arriba-derecha"),
        Marca(".cot-tarjeta input >> nth=0", 2),
        Marca(".cot-caja .cot-buscador", 3),
        Marca(".cot-boton-marca", 4, esquina="arriba-derecha"),
        Marca(".cot-tarjeta select >> nth=0", 5),
        Marca(".cot-guardar", 6),
    ]),
    Escena("03-03-detalle", PEDIDOS, preparar=lambda p: _abrir(p, 1), recorte=(".detail-drawer-header", seccion("Nota")), marcas=[
        Marca(".detail-drawer-title-h2", 1),
        Marca(seccion("Detalles"), 2),
        Marca(seccion("Cliente"), 3),
        Marca(seccion("Nota"), 4),
        Marca(".detail-drawer-close-btn", 5, forma="circulo"),
    ]),
    Escena("03-04-prendas", PEDIDOS, preparar=_en_seccion(1, "Prendas"), recorte=seccion("Prendas"), marcas=[
        Marca(f'{seccion("Prendas")} button:has-text("Cambiar precio")', 1, esquina="arriba-derecha"),
        Marca('button:has-text("Agregar prenda")', 2),
        Marca('button:has-text("Confirmar pedido…")', 3, esquina="arriba-derecha"),
    ]),
    Escena("03-05-agregar", PEDIDOS, preparar=_en_seccion(1, "Prendas", "Agregar prenda"), recorte=".sp-agregar", marcas=[
        Marca(".sp-agregar-cantidad", 1, esquina="arriba-derecha"),
        Marca(".armador__ancho-total", 2, esquina="arriba-derecha"),
        Marca(".armador__grilla input >> nth=0", 3, esquina="arriba-derecha"),
        Marca(".armador__agregar", 4, esquina="arriba-derecha"),
    ]),
    Escena("03-06-confirmar", PEDIDOS, preparar=_confirmar, recorte=".cfp-tarjeta", marcas=[
        Marca(".cfp-camino >> nth=0", 1),
        Marca(".cfp-queda >> nth=0", 2),
        Marca(".cfp-nota >> nth=0", 3),
        Marca(".cfp-nota >> nth=1", 4),
        Marca(".cfp-nota >> nth=2", 5),
        Marca(".cfp-pie .sp-boton--principal", 6, esquina="arriba-derecha"),
    ]),
    Escena("03-07-pagos", PEDIDOS, preparar=_en_seccion(2, "Pagos", "Registrar pago"), recorte=seccion("Pagos"), marcas=[
        Marca(".sp-pago-estado", 1, esquina="arriba-derecha"),
        Marca(".sp-pagos-saldo", 2, esquina="arriba-derecha"),
        Marca('.sp-pago >> nth=0 >> button:has-text("Anular")', 3, esquina="arriba-derecha"),
        Marca(".sp-canal-edicion", 4, esquina="arriba-derecha"),
    ]),
    Escena("03-08-prendas-confirmado", PEDIDOS, preparar=_en_seccion(3, "Prendas"), recorte=seccion("Prendas"), marcas=[
        Marca(".sp-camino >> nth=0", 1, esquina="arriba-derecha"),
        Marca('button:has-text("Cancelar prenda") >> nth=0', 2, esquina="arriba-derecha"),
        Marca(".sp-nota", 3, esquina="abajo-izquierda"),
    ]),
    Escena("03-09-entrega", PEDIDOS, preparar=_en_seccion(3, "Entrega"), recorte=seccion("Entrega"), marcas=[
        Marca(".sp-fecha-linea", 1, esquina="arriba-derecha"),
        Marca(f'{seccion("Entrega")} button:has-text("Cambiar fecha")', 2, esquina="abajo-derecha"),
        Marca(".sp-aviso", 3, esquina="arriba-derecha"),
        Marca('button:has-text("Marcar como entregado")', 4, esquina="arriba-derecha"),
    ]),
    Escena("03-10-falta", PEDIDOS, preparar=_en_seccion(2, "Despacho"), recorte=seccion("Despacho"), marcas=[
        Marca(f'{seccion("Despacho")} .sp-aviso', 1, esquina="arriba-derecha"),
        Marca(f'{seccion("Despacho")} .sp-aviso + *', 2, esquina="arriba-derecha"),
    ]),
    Escena("03-11-historia", PEDIDOS, preparar=_en_seccion(2, "Historia"), recorte=seccion("Historia"), marcas=[
        Marca(".sp-evento >> nth=0", 1, esquina="arriba-derecha"),
    ]),
    Escena("03-12-impresiones", PEDIDOS, preparar=_impresiones, recorte=".dd-bloque-destacado", marcas=[
        Marca(".dd-accion-principal", 1),
        Marca('.dd-accion-secundaria:has-text("Planilla")', 2),
        Marca('.dd-accion-secundaria:has-text("Comprobante")', 3, esquina="arriba-derecha"),
    ]),
]
