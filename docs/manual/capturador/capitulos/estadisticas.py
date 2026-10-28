"""
Capítulo 8 del manual: las estadísticas del sitio. El resumen, la tendencia
por día, las listas y la vista previa de un producto. Solo se mira: esta
pantalla no guarda nada. Hasta el lanzamiento los números son de prueba.
"""
from ..escena import Escena
from ..marcas import Marca

ESTADISTICAS = "/admin/dashboard/analytics"


def _cargada(p):
    p.wait_for_selector(".ana-metricas")
    p.wait_for_timeout(600)


def _un_dia(p):
    _cargada(p)
    p.locator(".ana-pulsable").last.click()
    p.wait_for_selector(".ana-dia")
    p.wait_for_timeout(400)


def _listas(p):
    _cargada(p)
    p.locator(".ana-listas").evaluate("e => e.scrollIntoView({block: 'start'})")
    p.wait_for_timeout(400)


def _vista_previa(p):
    _cargada(p)
    p.locator(".ana-fila-ranking--pulsable").first.click()
    p.wait_for_selector(".ana-ventana .ana-foto img", timeout=30000)   # trae la ficha entera: tarda
    p.wait_for_timeout(800)


ESCENAS = [
    Escena("08-01-resumen", ESTADISTICAS, preparar=_cargada, recorte=(".ana-cabecera", ".ana-metricas"), marcas=[
        Marca(".ana-cabecera select", 1, esquina="arriba-derecha"),
        Marca(".ana-metrica >> nth=0", 2),
        Marca(".ana-metrica >> nth=1", 3),
        Marca(".ana-metrica >> nth=4", 4),
        Marca(".ana-metrica >> nth=5", 5),
        Marca(".ana-metrica >> nth=6", 6, esquina="arriba-derecha"),
    ]),
    Escena("08-02-tendencia", ESTADISTICAS, preparar=_un_dia, alto=1100, recorte=".ana-panel >> nth=0", marcas=[
        Marca(".ana-selector-metrica", 1, esquina="arriba-derecha"),
        Marca(".ana-pulsable >> nth=-1", 2, esquina="arriba-derecha"),
        Marca(".ana-dia", 3),
    ]),
    Escena("08-03-listas", ESTADISTICAS, preparar=_listas, alto=1300, recorte=".ana-listas", marcas=[
        Marca(".ana-listas .ana-panel >> nth=0", 1),
        Marca(".ana-listas .ana-panel >> nth=1", 2),
        Marca(".ana-listas .ana-panel >> nth=2", 3),
        Marca(".ana-listas .ana-panel >> nth=3", 4),
        Marca(".ana-listas .ana-panel >> nth=4", 5),
        Marca(".ana-listas .ana-panel >> nth=5", 6),
    ]),
    Escena("08-04-vista-previa", ESTADISTICAS, preparar=_vista_previa, recorte=".ana-ventana", marcas=[
        Marca(".ana-ventana button:has-text('Ver en la tienda')", 1),
        Marca(".ana-ventana .ana-accion", 2, esquina="arriba-derecha"),
    ]),
]
