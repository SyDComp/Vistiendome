"""
¿La base y los archivos de medios dicen lo mismo?

Un respaldo de la base NO protege las fotos: los bytes viven en disco. Y dos
respaldos con la misma fecha tampoco alcanzan — hay que poder demostrar que
uno describe al otro. Esto es lo que lo demuestra.

Encuentra dos cosas distintas, y sólo una es grave:

  ENLACE ROTO   un registro apunta a un archivo que no está.
                Se ve: la foto no carga. Es un error de verdad.

  HUÉRFANO      un archivo que ningún registro menciona.
                No se ve: ocupa disco y nada más. Puede ser normal
                (una foto recién subida, algo que se borró a medias).

Se usa en tres momentos:
  · antes de respaldar  — para no guardar un estado ya roto
  · después de restaurar — para saber que la restauración quedó completa
  · cuando algo se ve raro

    python -m app.scripts.verificar_medios
    python -m app.scripts.verificar_medios --estricto   # sale 1 si hay enlaces rotos
"""

import os
import sys

sys.path.insert(0, ".")
from sqlmodel import Session, select  # noqa: E402

from app.database import engine  # noqa: E402
from app.models.catalog import MediaAsset  # noqa: E402

DIRECTORIO = os.environ.get("MEDIA_DIR", "media")

# Carpetas que el sistema GENERA y ningún MediaAsset menciona: no son huérfanas,
# son subproductos. Se rehacen solas cuando hacen falta. Si contaran como
# huérfanas, un huérfano de verdad quedaría escondido entre 247 códigos de
# barras y nadie lo vería.
GENERADAS = {"barcodes"}


def _ruta_en_disco(url: str) -> str:
    """`/media/foo.jpg` -> `<DIRECTORIO>/foo.jpg`."""
    return os.path.join(DIRECTORIO, (url or "").lstrip("/").removeprefix("media/"))


def revisar():
    engine.echo = False
    esperados = set()
    rotos = []

    with Session(engine) as db:
        activos = db.exec(select(MediaAsset)).all()
        for a in activos:
            for ruta in [a.url, *((a.metadata_json or {}).get("derivadas") or {}).values()]:
                if not ruta:
                    continue
                disco = _ruta_en_disco(ruta)
                esperados.add(os.path.normpath(disco))
                if not os.path.exists(disco):
                    rotos.append(ruta)

    en_disco, generados = set(), 0
    for raiz, _, archivos in os.walk(DIRECTORIO):
        rel = os.path.relpath(raiz, DIRECTORIO).split(os.sep)[0]
        if rel in GENERADAS:
            generados += len(archivos)
            continue
        for nombre in archivos:
            en_disco.add(os.path.normpath(os.path.join(raiz, nombre)))

    huerfanos = sorted(en_disco - esperados)
    return activos, esperados, rotos, huerfanos, generados


def main():
    activos, esperados, rotos, huerfanos, generados = revisar()

    print(f"registros de medios : {len(activos)}")
    print(f"archivos esperados  : {len(esperados)}  (originales + derivadas)")
    print(f"enlaces rotos       : {len(rotos)}")
    print(f"huerfanos en disco  : {len(huerfanos)}")
    print(f"generados (no cuentan): {generados}  ({', '.join(sorted(GENERADAS))})")

    for r in rotos[:15]:
        print(f"   ROTO      {r}")
    if len(rotos) > 15:
        print(f"   ... y {len(rotos) - 15} mas")
    for h in huerfanos[:10]:
        print(f"   huerfano  {h}")
    if len(huerfanos) > 10:
        print(f"   ... y {len(huerfanos) - 10} mas")

    if rotos:
        print("\nHay registros apuntando a archivos que no estan.")
    elif huerfanos:
        print("\nTodo lo que la base menciona esta en disco. Los huerfanos solo ocupan espacio.")
    else:
        print("\nLa base y el disco coinciden exactamente.")

    if "--estricto" in sys.argv and rotos:
        sys.exit(1)


if __name__ == "__main__":
    main()
