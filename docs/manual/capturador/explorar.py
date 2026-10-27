"""
Para escribir las marcas: lista los elementos visibles de una pantalla (con
su clase, posición y texto corto), sin sacar imágenes.

uso:  .venv/Scripts/python.exe -m capturador.explorar /admin/caja [teclas...]
      (una tecla que empieza con ~ se escribe como texto)
"""
import sys

from .navegador import pagina
from .tomar import ir

ELEMENTOS = r"""(dentro) => [...document.querySelectorAll(dentro + ' :is(button, a, input, select, textarea, h1, h2, h3, h4, th, [role=dialog], [class])')]
  .filter(e => e.getClientRects().length && !['svg', 'path', 'circle', 'rect', 'line', 'polyline', 'kbd'].includes(e.tagName.toLowerCase()))
  .filter(e => e.children.length === 0 || /^(BUTTON|A|SELECT|H\d|TH)$/.test(e.tagName) || e.className)
  .map(e => {
    const r = e.getBoundingClientRect();
    const clase = typeof e.className === 'string' ? e.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
    const texto = (e.innerText || e.placeholder || e.value || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').slice(0, 50);
    return `${e.tagName.toLowerCase()}${clase ? '.' + clase : ''} [${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}] ${texto}`;
  })"""


def elementos(p, dentro="body"):
    return p.evaluate(ELEMENTOS, dentro)


def main(ruta, teclas):
    with pagina() as p:
        ir(p, ruta)
        p.wait_for_timeout(800)
        for t in teclas:
            p.keyboard.type(t[1:]) if t.startswith("~") else p.keyboard.press(t)
            p.wait_for_timeout(300)
            p.wait_for_load_state("networkidle")
        for linea in elementos(p):
            print(linea)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2:])
