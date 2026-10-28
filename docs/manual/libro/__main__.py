"""
Arma el PDF del manual a partir de manual.md y las capturas, con Edge.

uso:  .venv/Scripts/python.exe -m libro      (desde docs/manual)
deja: docs/manual/Manual_Vistiendome.pdf
"""
from pathlib import Path

from playwright.sync_api import sync_playwright

from .markdown import a_html

MANUAL = Path(__file__).resolve().parent.parent
SALIDA = MANUAL / "Manual_Vistiendome.pdf"


def armar() -> Path:
    cuerpo = a_html((MANUAL / "manual.md").read_text(encoding="utf-8"), MANUAL.as_uri() + "/")
    estilo = (Path(__file__).parent / "estilo.css").read_text(encoding="utf-8")
    hoja = MANUAL / "libro" / "_manual.html"
    hoja.write_text(f'<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Manual de uso Vistiendomé</title>'
                    f"<style>{estilo}</style></head><body>{cuerpo}</body></html>", encoding="utf-8")
    try:
        with sync_playwright() as p:
            navegador = p.chromium.launch(channel="msedge")
            pagina = navegador.new_page()
            pagina.goto(hoja.as_uri(), wait_until="networkidle")
            pagina.pdf(path=str(SALIDA), format="Letter", print_background=True,
                       display_header_footer=True, header_template="<span></span>",
                       footer_template='<div style="font-size:8pt;width:100%;text-align:center;color:#888">'
                                       '<span class="pageNumber"></span> / <span class="totalPages"></span></div>',
                       margin={"top": "18mm", "bottom": "18mm", "left": "16mm", "right": "16mm"})
            navegador.close()
    finally:
        hoja.unlink(missing_ok=True)
    return SALIDA


if __name__ == "__main__":
    print(armar())
