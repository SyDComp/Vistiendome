"""
Capítulo 7 del manual: los ajustes del negocio. Plazos, abono mínimo,
política de cambios, medios de pago y cómo llegó el pedido.

Son los ajustes reales de la tienda: aquí solo se abre la pantalla y se marca.
No se aprieta ningún Guardar.
"""
from ..escena import Escena
from ..marcas import Marca

AJUSTES = "/admin/dashboard/ajustes"


def tarjeta(id_titulo):
    return f'section[aria-labelledby="{id_titulo}"]'


PLAZOS, ABONO, POLITICA, MEDIOS, CANALES = (tarjeta(t) for t in (
    "aj-plazos-titulo", "aj-abono-titulo", "aj-politica-titulo", "aj-medios-titulo", "aj-canales-titulo"))


def _ver(selector):
    def preparar(p):
        p.wait_for_selector(PLAZOS)
        p.locator(selector).evaluate("e => e.scrollIntoView({block: 'start'})")
        p.wait_for_timeout(400)
    return preparar


ESCENAS = [
    Escena("07-01-plazos", AJUSTES, preparar=_ver(PLAZOS), alto=1100, recorte=(PLAZOS, ABONO), marcas=[
        Marca(f"{PLAZOS} >> .aj-plazo >> nth=0", 1),
        Marca(f"{PLAZOS} >> .aj-plazo >> nth=1", 2),
        Marca(f"{PLAZOS} >> .aj-boton--principal", 3, esquina="arriba-derecha"),
        Marca(f"{ABONO} >> .aj-plazos", 4),
        Marca(f"{ABONO} >> .aj-boton--principal", 5, esquina="arriba-derecha"),
    ]),
    Escena("07-02-politica", AJUSTES, preparar=_ver(POLITICA), alto=1100, recorte=POLITICA, marcas=[
        Marca(f"{POLITICA} >> .aj-plazo", 1),
        Marca(f"{POLITICA} >> .aj-interruptor", 2),
        Marca(f"{POLITICA} >> .aj-vista", 3),
        Marca(f"{POLITICA} >> .aj-boton--principal", 4, esquina="arriba-derecha"),
    ]),
    Escena("07-03-medios", AJUSTES, preparar=_ver(MEDIOS), alto=1300, recorte=(MEDIOS, CANALES), marcas=[
        Marca(f"{MEDIOS} >> .aj-opcion >> nth=0 >> input", 1),
        Marca(f"{MEDIOS} >> .aj-opcion >> nth=1 >> .aj-icono >> nth=0", 2, forma="circulo"),
        Marca(f"{MEDIOS} >> .aj-opcion >> nth=1 >> .aj-icono--quitar", 3, forma="circulo"),
        Marca(f"{MEDIOS} >> .aj-agregar", 4),
        Marca(f"{MEDIOS} >> .aj-acciones", 5, esquina="arriba-derecha"),
        Marca(f"{CANALES} >> .aj-lista", 6),
    ]),
]
