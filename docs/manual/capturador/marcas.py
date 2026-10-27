"""
Las marcas de una captura: qué elemento se señala, con qué número y qué nota.
Playwright mide cada elemento en la página; marcas.js las dibuja encima.
"""
from dataclasses import dataclass
from pathlib import Path

DIBUJAR = (Path(__file__).parent / "marcas.js").read_text(encoding="utf-8")
LADOS = ("derecha", "izquierda", "arriba", "abajo")
ESQUINAS = ("arriba-izquierda", "arriba-derecha", "abajo-izquierda", "abajo-derecha")


class ElementoNoVisible(Exception):
    """El selector no encontró nada visible: la pantalla cambió o el selector está mal."""


@dataclass
class Marca:
    selector: str                 # selector de Playwright: css, text=..., :has-text(...)
    n: int | None = None
    nota: str | None = None
    lado: str = "derecha"         # dónde va la nota respecto del elemento
    forma: str = "recuadro"       # o "circulo"
    distancia: int | None = None  # px de la nota al elemento; más, para llevarla a un espacio vacío
    esquina: str = "arriba-izquierda"   # dónde va el número del recuadro, para no tapar texto

    def __post_init__(self):
        if self.lado not in LADOS:
            raise ValueError(f"lado: {self.lado} (debe ser uno de {LADOS})")
        if self.esquina not in ESQUINAS:
            raise ValueError(f"esquina: {self.esquina} (debe ser una de {ESQUINAS})")


def marcar(p, marcas):
    medidas = []
    for m in marcas:
        caja = p.locator(m.selector).first.bounding_box()
        if caja is None:
            raise ElementoNoVisible(m.selector)
        medidas.append({"caja": caja, "n": m.n, "nota": m.nota, "lado": m.lado, "forma": m.forma,
                        "distancia": m.distancia, "esquina": m.esquina})
    p.evaluate(DIBUJAR, medidas)


def desmarcar(p):
    p.evaluate("() => document.getElementById('marcas-manual')?.remove()")
