"""
¿Lo que se subió es de verdad una imagen que el sitio puede mostrar?

La subida de la galería solo miraba la extensión del nombre: un "roto.jpg" con
bytes basura se guardaba y quedaba como imagen rota (visto 2026-11-24). Aquí
se abre con Pillow y se decodifica entera, ANTES de escribir nada en disco: lo
que no pasa no deja archivos a medias.

El formato que cuenta es el del contenido, no el del nombre: un TIFF
renombrado a .jpg se abre bien en Pillow, pero el navegador no lo muestra.
"""

from typing import BinaryIO, Optional

from PIL import Image

# Los que muestran todos los navegadores (los mismos que pide el cliente:
# client/src/lib/api/endpoints/subirImagen.api.js).
FORMATOS_WEB = {"JPEG", "PNG", "WEBP", "GIF"}

NO_ES_IMAGEN = "El archivo no es una imagen válida: puede estar dañado. Prueba con otra copia o vuelve a exportarla."


def motivo_invalida(archivo: BinaryIO) -> Optional[str]:
    """None si sirve; si no, por qué, para quien la subió. Deja el archivo al principio."""
    try:
        with Image.open(archivo) as imagen:
            formato = imagen.format
            imagen.verify()                 # la estructura del archivo
        archivo.seek(0)
        with Image.open(archivo) as imagen:
            imagen.load()                   # los píxeles: una foto cortada falla aquí
    except Exception:                       # Pillow lanza de varios tipos según el formato
        return NO_ES_IMAGEN
    finally:
        archivo.seek(0)
    if formato not in FORMATOS_WEB:
        return f"La imagen está en formato {formato}, que el sitio no puede mostrar. Usa JPG, PNG, WEBP o GIF."
    return None
