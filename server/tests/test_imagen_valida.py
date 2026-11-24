"""
La galería solo guarda imágenes de verdad (core/imagen_valida.py): un archivo
dañado o en un formato que el navegador no muestra se rechaza con 400, sin
dejar nada en disco.
"""

import io
import os

from PIL import Image

from app.api.v1 import media
from app.core.imagen_valida import NO_ES_IMAGEN, motivo_invalida


def _imagen(formato: str) -> bytes:
    salida = io.BytesIO()
    Image.new("RGB", (40, 30), (200, 30, 90)).save(salida, format=formato)
    return salida.getvalue()


def test_una_imagen_real_pasa_y_queda_al_principio():
    archivo = io.BytesIO(_imagen("PNG"))
    assert motivo_invalida(archivo) is None
    assert archivo.tell() == 0


def test_basura_y_fotos_cortadas_no_pasan():
    assert motivo_invalida(io.BytesIO(bytes([7]) * 5000)) == NO_ES_IMAGEN
    jpeg = _imagen("JPEG")
    assert motivo_invalida(io.BytesIO(jpeg[: len(jpeg) // 2])) == NO_ES_IMAGEN


def test_un_formato_que_el_navegador_no_muestra_no_pasa_aunque_se_llame_jpg():
    assert "TIFF" in motivo_invalida(io.BytesIO(_imagen("TIFF")))


def test_la_subida_rechaza_un_archivo_danado_sin_escribir_nada(client_admin, tmp_path, monkeypatch):
    monkeypatch.setattr(media, "UPLOAD_DIR", str(tmp_path))
    r = client_admin.post("/api/v1/media/upload",
                          files={"file": ("roto.jpg", bytes([7]) * 5000, "image/jpeg")})
    assert r.status_code == 400
    assert r.json()["detail"] == NO_ES_IMAGEN
    assert os.listdir(tmp_path) == []
