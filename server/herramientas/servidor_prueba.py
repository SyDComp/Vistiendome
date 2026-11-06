"""
Levanta el server local contra la base de pruebas `vistiendome_prueba`, no
contra `vistiendome_db` (la copia local, que no se toca).

    ./server/venv/Scripts/python.exe server/herramientas/servidor_prueba.py 8017

Lee el .env de la raíz y solo cambia el nombre de la base. La cuenta para
entrar la crea herramientas/cuenta_prueba.py (con la misma base).
"""

import os
import pathlib
import sys

RAIZ = pathlib.Path(__file__).resolve().parents[2]
BASE = "vistiendome_prueba"


def _cargar_env() -> None:
    for linea in (RAIZ / ".env").read_text(encoding="utf-8").splitlines():
        if "=" in linea and not linea.lstrip().startswith("#"):
            clave, valor = linea.split("=", 1)
            os.environ.setdefault(clave.strip(), valor.strip())
    os.environ["DATABASE_URL"] = os.environ["DATABASE_URL"].rsplit("/", 1)[0] + "/" + BASE


if __name__ == "__main__":
    _cargar_env()
    os.chdir(RAIZ / "server")
    sys.path.insert(0, str(RAIZ / "server"))
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=int(sys.argv[1]), log_level="warning")
