"""
Cuantas veces seguidas puede llamar a algo quien no se ha identificado.

Existe porque hay endpoints que tienen que ser publicos —alguien escribiendo el
nombre de un color necesita respuesta en el momento, sin haber iniciado sesion—
y publico sin limite es una invitacion: cada llamada abre la base, recorre el
dominio de una caracteristica y compara texto contra todas sus opciones. Sin
tope, un script deja el servidor ocupado con eso.

No pretende ser un WAF. Es el minimo para que un endpoint abierto no sea una
palanca gratis contra la base.
"""

import time
from collections import defaultdict, deque
from threading import Lock
from typing import Deque, Dict


class VentanaDeslizante:
    """
    N llamadas por ventana de segundos, por clave (la IP).

    Deque y no contador: con un contador que se reinicia cada minuto, alguien
    gasta el cupo al final de una ventana y otro tanto al principio de la
    siguiente, y pasa el doble de golpe.

    Vive en memoria del proceso a proposito: no vale la pena una dependencia
    externa para esto, y si el proceso se reinicia perder el conteo no tiene
    consecuencia. Con varios procesos el limite es por proceso, que sigue siendo
    un limite.
    """

    def __init__(self, maximo: int, ventana_seg: float):
        self.maximo = maximo
        self.ventana = ventana_seg
        self._marcas: Dict[str, Deque[float]] = defaultdict(deque)
        self._candado = Lock()

    def permite(self, clave: str) -> bool:
        ahora = time.monotonic()
        with self._candado:
            marcas = self._marcas[clave]
            # Fuera lo que ya salio de la ventana. Esto tambien es la limpieza:
            # sin esto el diccionario crece con cada IP que pasa.
            while marcas and ahora - marcas[0] > self.ventana:
                marcas.popleft()
            if not marcas and clave in self._marcas and len(self._marcas) > 10000:
                self._marcas.pop(clave, None)
            if len(marcas) >= self.maximo:
                return False
            marcas.append(ahora)
            return True
