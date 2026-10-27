"""
Una escena del manual: a qué pantalla se va, qué se hace para dejarla en el
estado que se explica, qué se marca y qué parte se guarda. Correrlas es
abrir cada una en una página limpia, prepararla, marcarla y tomarla.
"""
from dataclasses import dataclass, field
from typing import Callable

from .marcas import Marca, marcar
from .navegador import pagina
from .tomar import ir, tomar


@dataclass
class Escena:
    nombre: str                                   # el archivo: capturas/<nombre>.png
    ruta: str
    preparar: Callable = lambda p: None
    marcas: list[Marca] = field(default_factory=list)
    recorte: str | tuple | None = None            # selector(es) de la zona que se guarda; nada = la pantalla
    crea_datos: bool = False                      # deja una venta u otro registro (de demostración)


def correr(escenas, solo=None):
    elegidas = [e for e in escenas if not solo or e.nombre in solo]
    with pagina() as p:
        for e in elegidas:
            ir(p, e.ruta)
            p.wait_for_timeout(600)
            e.preparar(p)
            marcar(p, e.marcas)
            print(tomar(p, e.nombre, e.recorte).name, "· crea datos" if e.crea_datos else "")
