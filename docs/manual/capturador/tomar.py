"""
Tomar una captura: ir a la pantalla, esperar a que termine de cargar y
guardarla en docs/manual/capturas/, entera o recortada a una zona.
"""
from .navegador import CAPTURAS, SITIO, VENTANA

MARGEN_RECORTE = 32     # alrededor de la zona: que entren los números de las marcas


class SinSesion(Exception):
    """El panel mandó al ingreso: hay que volver a correr capturador.sesion."""


def ir(p, ruta):
    p.goto(f"{SITIO}{ruta}", wait_until="networkidle")
    if "/admin/login" in p.url:
        raise SinSesion("La sesión venció: corre  .venv/Scripts/python.exe -m capturador.sesion")


def _zona(p, selectores):
    """El rectángulo que contiene a todos los elementos dados, con margen."""
    if isinstance(selectores, str):
        selectores = (selectores,)
    cajas = [p.locator(s).first.bounding_box() for s in selectores]
    ventana = p.viewport_size or VENTANA
    x0 = max(min(c["x"] for c in cajas) - MARGEN_RECORTE, 0)
    y0 = max(min(c["y"] for c in cajas) - MARGEN_RECORTE, 0)
    x1 = min(max(c["x"] + c["width"] for c in cajas) + MARGEN_RECORTE, ventana["width"])
    y1 = min(max(c["y"] + c["height"] for c in cajas) + MARGEN_RECORTE, ventana["height"])
    return {"x": x0, "y": y0, "width": x1 - x0, "height": y1 - y0}


def tomar(p, nombre, recorte=None):
    CAPTURAS.mkdir(exist_ok=True)
    destino = CAPTURAS / f"{nombre}.png"
    p.screenshot(path=str(destino), clip=_zona(p, recorte) if recorte else None)
    return destino
