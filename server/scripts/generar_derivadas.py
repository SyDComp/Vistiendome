"""
Genera las versiones livianas de las fotos que ya estaban subidas.

Las fotos nuevas obtienen sus derivadas al subirse (Fase 1); este script es
para las que se cargaron antes de que eso existiera. Se corre una vez, a mano.

Idempotente: se puede cortar a la mitad y volver a correr sin rehacer trabajo
ni duplicar archivos — 320 fotos no se procesan en un instante y hay que poder
interrumpirlo sin miedo.

Uso, desde la carpeta `server/`:
    ./venv/Scripts/python.exe scripts/generar_derivadas.py
    ./venv/Scripts/python.exe scripts/generar_derivadas.py --simular
"""

import os
import sys

# La consola de Windows usa cp850 y revienta (o destroza) los acentos. Sin
# esto, un nombre de archivo con tilde puede cortar el script a la mitad.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Permite importar `app.*` corriendo el script desde `server/`
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlmodel import Session, select  # noqa: E402

from app.database import engine  # noqa: E402
from app.models.catalog import MediaAsset  # noqa: E402
from app.core.imagenes import generar_derivadas, TAMANOS, SUBCARPETA  # noqa: E402

UPLOAD_DIR = "media"


def _peso_carpeta(ruta: str) -> int:
    total = 0
    for raiz, _, archivos in os.walk(ruta):
        for archivo in archivos:
            try:
                total += os.path.getsize(os.path.join(raiz, archivo))
            except OSError:
                pass
    return total


def _ya_tiene_derivadas(asset: MediaAsset) -> bool:
    """
    Sólo se considera hecho si el registro las lista Y los archivos existen de
    verdad: un registro apuntando a un archivo borrado es peor que no tenerlo,
    porque el sitio pediría una imagen que da 404.
    """
    derivadas = (asset.metadata_json or {}).get("derivadas") or {}
    if not derivadas:
        return False
    return all(os.path.exists(url.lstrip("/")) for url in derivadas.values())


def main(simular: bool = False) -> None:
    # El motor de la app trae echo=True: acá el volcado de SQL tapa el progreso,
    # que es lo único que interesa mirar mientras corre.
    engine.echo = False

    antes = _peso_carpeta(UPLOAD_DIR)
    print(f"Media antes: {antes / 1048576:.1f} MB\n")

    with Session(engine) as sesion:
        assets = sesion.exec(select(MediaAsset)).all()
        total = len(assets)
        print(f"{total} imágenes registradas en la base.\n")

        hechas = saltadas = sin_archivo = fallidas = 0

        for i, asset in enumerate(assets, 1):
            ruta = os.path.join(UPLOAD_DIR, asset.filename)

            if not os.path.exists(ruta):
                sin_archivo += 1
                print(f"[{i}/{total}] SIN ARCHIVO en disco: {asset.filename}")
                continue

            if _ya_tiene_derivadas(asset):
                saltadas += 1
                continue

            if simular:
                print(f"[{i}/{total}] (simulación) generaría: {asset.filename}")
                hechas += 1
                continue

            try:
                derivadas = generar_derivadas(ruta, UPLOAD_DIR)
                if not derivadas:
                    # Formato omitido o imagen ya más chica que todos los
                    # objetivos: no es un error, no hay nada que generar.
                    saltadas += 1
                    continue

                # Reasignar el dict completo: mutarlo en el lugar no siempre lo
                # marca como modificado y el cambio no llegaría a la base.
                meta = dict(asset.metadata_json or {})
                meta["derivadas"] = derivadas
                asset.metadata_json = meta
                sesion.add(asset)
                sesion.commit()

                hechas += 1
                print(f"[{i}/{total}] {asset.filename} -> {', '.join(derivadas)}")
            except Exception as e:
                fallidas += 1
                print(f"[{i}/{total}] ERROR en {asset.filename}: {e}")

    despues = _peso_carpeta(UPLOAD_DIR)
    print("\n" + "-" * 50)
    print(f"generadas: {hechas} | ya estaban: {saltadas} | sin archivo: {sin_archivo} | con error: {fallidas}")
    print(f"Media después: {despues / 1048576:.1f} MB  (+{(despues - antes) / 1048576:.1f} MB)")


if __name__ == "__main__":
    main(simular="--simular" in sys.argv)
