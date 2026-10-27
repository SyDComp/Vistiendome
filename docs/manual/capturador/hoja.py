"""
Para revisar: junta varias capturas en una sola imagen (una hoja de
contactos), así se revisan de una vez. La hoja va a la carpeta que se diga,
no al proyecto.

uso:  .venv/Scripts/python.exe -m capturador.hoja <carpeta> <columnas> 04-01-ordenes 04-02-detalle ...
"""
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

from .navegador import CAPTURAS


def armar(destino: Path, columnas: int, nombres: list[str]) -> Path:
    destino = destino.resolve()
    celdas = "".join(
        f'<div><div style="color:#fff;font:14px sans-serif">{n}</div>'
        f'<img style="width:100%" src="{(CAPTURAS / f"{n}.png").as_uri()}"></div>'
        for n in nombres
    )
    html = (f'<body style="margin:0;background:#777;display:grid;grid-template-columns:repeat({columnas},1fr);'
            f'gap:8px;width:1800px;align-items:start">{celdas}</body>')
    archivo = destino / "hoja.html"
    archivo.write_text(html, encoding="utf-8")
    imagen = destino / "hoja.png"
    with sync_playwright() as p:
        navegador = p.chromium.launch(channel="msedge")
        pagina = navegador.new_page(viewport={"width": 1800, "height": 400})
        pagina.goto(archivo.as_uri())
        pagina.wait_for_timeout(800)
        pagina.screenshot(path=str(imagen), full_page=True)
        navegador.close()
    archivo.unlink()
    return imagen


if __name__ == "__main__":
    print(armar(Path(sys.argv[1]), int(sys.argv[2]), sys.argv[3:]))
