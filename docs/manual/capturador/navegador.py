"""
El navegador de las capturas: el Edge que ya está instalado en el PC (no se
descarga otro), con la ventana y la nitidez del manual.
"""
from contextlib import contextmanager
from pathlib import Path

from playwright.sync_api import sync_playwright

SITIO = "https://vistiendomechile.com"
MANUAL = Path(__file__).resolve().parent.parent
SESION = MANUAL / ".sesion.json"          # fuera de git
CAPTURAS = MANUAL / "capturas"

VENTANA = {"width": 1440, "height": 900}
NITIDEZ = 2                               # el doble de píxeles, para el PDF


@contextmanager
def pagina(con_ventana=False, con_sesion=True):
    with sync_playwright() as p:
        navegador = p.chromium.launch(channel="msedge", headless=not con_ventana)
        contexto = navegador.new_context(
            viewport=VENTANA, device_scale_factor=NITIDEZ, locale="es-CL",
            timezone_id="America/Santiago",
            storage_state=str(SESION) if con_sesion and SESION.exists() else None,
        )
        try:
            yield contexto.new_page()
        finally:
            navegador.close()
