"""
Capítulo 2 del manual: la caja del local. Cada escena deja la caja en un
estado con el teclado, igual que se usa en la tienda.
"""
from ..escena import Escena
from ..marcas import Marca

CAJA = "/admin/caja"
PAUSA = 900         # lo que tarda la caja en traer lo que se pidió


def _teclas(p, *teclas):
    for t in teclas:
        p.keyboard.press(t)
        p.wait_for_timeout(PAUSA)


def _tarjetas(p):
    p.keyboard.press("Space")
    p.wait_for_selector(".cj-sel-tarjeta")
    p.wait_for_timeout(400)


def _buscar(p, texto):
    p.keyboard.press("b")
    p.keyboard.type(texto, delay=60)       # escrito a mano: rápido sería la pistola
    p.wait_for_selector(".cj-sugerido")
    p.wait_for_timeout(400)


def _venta(p):
    """Dos prendas: un Vestido Noemi por tarjetas y un tapado por búsqueda."""
    _tarjetas(p)
    _teclas(p, "2", "1", "6", "Escape")     # Noemi · talla 12 · Azul Rey; se cierra el selector
    _buscar(p, "tapado negro m")
    p.locator(".cj-sugerido").first.click()
    p.wait_for_timeout(PAUSA)
    _teclas(p, "Escape", "ArrowDown", "ArrowDown")    # a atajos; se marca la segunda prenda


def _cobro(p):
    _venta(p)
    p.locator(".vl-pago input.sp-select").first.fill("20000")
    p.get_by_role("button", name="Agregar otro medio").click()
    p.locator(".vl-pago select").nth(1).select_option("Débito")
    p.locator(".cj-vuelto input").fill("25000")
    p.locator("body").click(position={"x": 5, "y": 890})     # sale del campo, como al terminar de escribir
    p.wait_for_timeout(400)


def _con_datos(p):
    _venta(p)
    p.keyboard.press("p")
    p.wait_for_timeout(400)


def _cobrada(p):
    """Todo en efectivo: paga con $30.000 y se le da vuelto. Se cobra con la C."""
    _venta(p)
    p.locator(".cj-vuelto input").fill("30000")
    _teclas(p, "Escape", "c")
    p.wait_for_selector(".cj-hecha", timeout=20000)
    p.wait_for_timeout(800)


def _cierre(p):
    p.keyboard.press("d")
    p.wait_for_selector(".cc-cuerpo, .cj-vacio")
    p.wait_for_timeout(PAUSA)


ESCENAS = [
    Escena("02-01-caja", CAJA, recorte=(".cj-cabecera", ".cj-cobro"), marcas=[
        Marca(".cj-modo", 1),
        Marca(".cj-ayuda", 2, esquina="abajo-izquierda"),
        Marca(".cj-volver", 3),
        Marca(".cj-lector-campo", 4),
        Marca(".cj-lector .cj-tarjetas", 5),
        Marca(".cj-total", 6),
        Marca(".cj-cobrar", 7),
    ]),
    Escena("02-02-buscar", CAJA, preparar=lambda p: _buscar(p, "tapado negro m"), recorte=".cj-venta", marcas=[
        Marca(".cj-lector-campo", 1),
        Marca(".cj-etiquetas", 2),
        Marca(".cj-sugerido", 3),
    ]),
    Escena("02-03-tarjetas", CAJA, preparar=_tarjetas, recorte=".cj-sel", marcas=[
        Marca(".cj-sel-tarjeta .cj-sel-tecla", 1, forma="circulo"),
        Marca(".cj-sel-tarjeta .cj-sel-dato", 2, esquina="arriba-derecha"),
        Marca(".cj-sel-cabecera .cj-tarjetas", 3),
        Marca(".cj-sel-ayuda", 4),
    ]),
    Escena("02-04-opciones", CAJA, preparar=lambda p: (_tarjetas(p), _teclas(p, "2")), recorte=".cj-sel", marcas=[
        Marca(".cj-sel-ruta", 1),
        Marca(".cj-sel-opcion--marcada", 2),
        Marca(".cj-sel-paginas", 3),
    ]),
    Escena("02-05-filtros", CAJA, preparar=lambda p: (_tarjetas(p), _teclas(p, "f")), recorte=".cj-sel", marcas=[
        Marca(".cj-sel-grilla", 1),
    ]),
    Escena("02-06-venta", CAJA, preparar=_venta, recorte=(".cj-cabecera", ".cj-venta", ".cj-cobro"), marcas=[
        Marca(".cj-linea--marcada", 1),
        Marca(".cj-linea--marcada .cj-cantidad", 2),
        Marca(".cj-linea--marcada .cj-precio", 3),
        Marca(".cj-linea--marcada .cj-icono--quitar", 4, forma="circulo"),
        Marca(".cj-total", 5),
    ]),
    Escena("02-07-cobro", CAJA, preparar=_cobro, recorte=".cj-cobro", marcas=[
        Marca(".vl-opciones", 1),
        Marca(".vl-pago >> nth=0", 2),
        Marca(".vl-pago >> nth=1", 3),
        Marca(".cj-vuelto", 4),
        Marca(".cj-cobrar", 5),
    ]),
    Escena("02-08-con-datos", CAJA, preparar=_con_datos, recorte=".cj-cobro", marcas=[
        Marca(".vl-campos", 1),
    ]),
    Escena("02-09-cobrada", CAJA, preparar=_cobrada, crea_datos=True, recorte=".cj-hecha", marcas=[
        Marca(".cj-hecha-total", 1),
        Marca(".cj-hecha-vuelto", 2),
        Marca(".cj-hecha-acciones .sp-boton", 3),
        Marca(".cj-hecha-acciones .cj-cobrar", 4),
    ]),
    Escena("02-10-cierre", CAJA, preparar=_cierre, recorte=".cj-sel", marcas=[
        Marca(".cc-dia", 1),
        Marca(".cc-imprimir", 2, esquina="arriba-derecha"),
        Marca(".cc-cajon", 3),
        Marca(".cc-bloque >> nth=0", 4, esquina="arriba-derecha"),
        Marca(".cc-bloque:has(.cc-ventas) >> nth=0", 5),
    ]),
]
