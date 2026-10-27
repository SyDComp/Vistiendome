"""
Una escena del manual: a qué pantalla se va, qué se hace para dejarla en el
estado que se explica, qué se marca y qué parte se guarda. Correrlas es
abrir cada una en una página limpia, prepararla, marcarla y tomarla.
"""
from dataclasses import dataclass, field
from typing import Callable

from .marcas import Marca, marcar
from .navegador import VENTANA, pagina
from .tomar import SinSesion, ir, tomar


@dataclass
class Escena:
    nombre: str                                   # el archivo: capturas/<nombre>.png
    ruta: str
    preparar: Callable = lambda p: None
    marcas: list[Marca] = field(default_factory=list)
    recorte: str | tuple | None = None            # selector(es) de la zona que se guarda; nada = la pantalla
    crea_datos: bool = False                      # deja una venta u otro registro (de demostración)
    alto: int | None = None                       # ventana más alta, si lo que se explica no cabe en 900 px


def correr(escenas, solo=None):
    elegidas = [e for e in escenas if not solo or e.nombre in solo]
    fallidas = []
    with pagina() as p:
        for e in elegidas:
            try:
                p.set_viewport_size({**VENTANA, "height": e.alto or VENTANA["height"]})
                ir(p, e.ruta)
                p.wait_for_timeout(600)
                e.preparar(p)
                marcar(p, e.marcas)
                print(tomar(p, e.nombre, e.recorte).name, "· crea datos" if e.crea_datos else "")
            except SinSesion:
                raise
            except Exception as error:      # una pantalla que cambió no detiene las demás
                fallidas.append(e.nombre)
                print(f"{e.nombre}: NO SE TOMÓ · {type(error).__name__}: {str(error).splitlines()[0]}")
    if fallidas:
        raise SystemExit(f"Sin tomar: {', '.join(fallidas)}")
