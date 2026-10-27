"""
Rehace las capturas de un capítulo (o solo algunas escenas).

uso (desde docs/manual):
    .venv/Scripts/python.exe -m capturador caja
    .venv/Scripts/python.exe -m capturador caja 02-07-cobro 02-10-cierre
"""
import sys

from .capitulos import CAPITULOS
from .escena import correr

if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in CAPITULOS:
        sys.exit(f"capítulo: uno de {', '.join(CAPITULOS)}")
    correr(CAPITULOS[sys.argv[1]], solo=sys.argv[2:])
