"""
Para escribir las marcas: lista los elementos visibles de una pantalla con
clase (prefijo dado) y su texto corto, sin sacar imágenes.

uso:  .venv/Scripts/python.exe -m capturador.explorar /admin/caja cj- [teclas...]
"""
import sys

from .navegador import pagina
from .tomar import ir

LISTAR = """(prefijo) => [...document.querySelectorAll('*')]
  .filter(e => [...e.classList].some(c => c.startsWith(prefijo)) && e.getClientRects().length)
  .map(e => {
    const r = e.getBoundingClientRect();
    const texto = (e.innerText || e.placeholder || '').replace(/\\s+/g, ' ').slice(0, 60);
    return `${[...e.classList].join('.')} [${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}] ${texto}`;
  })"""


def main(ruta, prefijo, teclas):
    with pagina() as p:
        ir(p, ruta)
        p.wait_for_timeout(800)
        for t in teclas:
            p.keyboard.type(t[1:]) if t.startswith("~") else p.keyboard.press(t)
            p.wait_for_timeout(300)
            p.wait_for_load_state("networkidle")
        for linea in p.evaluate(LISTAR, prefijo):
            print(linea)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3:])
