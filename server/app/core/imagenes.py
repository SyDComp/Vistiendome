"""
Derivadas de imagen: versiones livianas de una foto para no mandar 1638x2048
cuando en pantalla se ven 280x350.

Una sola responsabilidad: dado un archivo en disco, producir sus derivadas y
devolver sus rutas. No toca la base de datos ni sabe qué es un MediaAsset —
quien llama decide dónde registrar el resultado.

El original NUNCA se modifica ni se borra: es la copia maestra.
"""

import os
from typing import Dict, Optional

from PIL import Image, ImageOps

# Anchos elegidos por lo que la aplicación realmente muestra, no por costumbre:
#   sm -> tarjetas de catálogo (se ven a 280 px; 400 cubre pantallas densas)
#   md -> ficha de producto
#   lg -> zoom y pantallas grandes
TAMANOS = {"sm": 400, "md": 800, "lg": 1600}

SUBCARPETA = "derivadas"
CALIDAD = 82  # WebP a 82 es visualmente indistinguible y pesa la mitad que JPEG 90

# Los GIF pueden ser animados: convertirlos a WebP estático perdería la
# animación sin avisar. Se los deja pasar sin derivadas.
EXTENSIONES_OMITIDAS = {".gif"}


def _preparar(imagen: Image.Image) -> Image.Image:
    """
    Corrige la orientación y el modo de color.

    Sin `exif_transpose`, las fotos sacadas con el celular en vertical salen
    acostadas: el archivo guarda los píxeles apaisados y la rotación sólo como
    un dato EXIF que se pierde al reprocesar.
    """
    imagen = ImageOps.exif_transpose(imagen)
    # WebP no maneja CMYK ni paletas indexadas; RGBA sí (conserva transparencia)
    if imagen.mode not in ("RGB", "RGBA"):
        imagen = imagen.convert("RGBA" if "A" in imagen.mode else "RGB")
    return imagen


def generar_derivadas(ruta_original: str, directorio_base: str) -> Dict[str, str]:
    """
    Genera las derivadas de una imagen y devuelve sus URL públicas por tamaño.

    @param ruta_original   Ruta en disco del archivo ya guardado.
    @param directorio_base Carpeta raíz de medios (la que se sirve como /media).
    @return {"sm": "/media/derivadas/x_sm.webp", ...}. Vacío si no se generó
            ninguna (formato omitido, o el original ya es más chico que todos
            los objetivos).
    """
    nombre = os.path.basename(ruta_original)
    base, extension = os.path.splitext(nombre)
    if extension.lower() in EXTENSIONES_OMITIDAS:
        return {}

    destino = os.path.join(directorio_base, SUBCARPETA)
    os.makedirs(destino, exist_ok=True)

    generadas: Dict[str, str] = {}
    with Image.open(ruta_original) as original:
        imagen = _preparar(original)
        ancho_real = imagen.width

        for etiqueta, ancho in TAMANOS.items():
            # No agrandar: inventar píxeles sólo suma peso y no mejora nada.
            if ancho_real <= ancho:
                continue

            alto = round(imagen.height * ancho / ancho_real)
            copia = imagen.resize((ancho, alto), Image.LANCZOS)

            archivo = f"{base}_{etiqueta}.webp"
            copia.save(os.path.join(destino, archivo), "WEBP", quality=CALIDAD, method=6)
            generadas[etiqueta] = f"/{directorio_base}/{SUBCARPETA}/{archivo}"

    return generadas


def eliminar_derivadas(ruta_original: str, directorio_base: str) -> int:
    """
    Borra las derivadas de una imagen. Se usa al eliminar o reemplazar el
    original, para no dejar archivos huérfanos ocupando disco.

    @return cuántas se borraron.
    """
    base, _ = os.path.splitext(os.path.basename(ruta_original))
    destino = os.path.join(directorio_base, SUBCARPETA)
    borradas = 0
    for etiqueta in TAMANOS:
        ruta = os.path.join(destino, f"{base}_{etiqueta}.webp")
        if os.path.exists(ruta):
            os.remove(ruta)
            borradas += 1
    return borradas
