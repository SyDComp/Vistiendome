"""
¿Está listo para salir? Se calcula, nadie lo marca.

Un pedido confirmado está listo cuando cada prenda tiene con qué salir:

  · las de BODEGA, apartadas (no esperando a que llegue);
  · las del TALLER, hechas: la orden de corte que las tenía se finalizó.
    Personalizadas incluidas: antes solo se contaban las del catálogo, y un
    pedido podía figurar "listo" con una personalizada sin hacer.

Las canceladas no cuentan. Lo que falta se dice prenda por prenda: quien
despacha necesita saber de una vez todo lo que falta, no descubrirlo de a uno.
"""

from dataclasses import dataclass, field
from typing import Dict, List

from ....models.crm import Cotizacion, EstadoCotizacion
from ..cotizar import nombre_de_prenda
from ..prendas import activas
from .caminos import BODEGA, ESPERANDO, TALLER


@dataclass
class Avance:
    taller: int = 0       # prendas que hace el taller
    hechas: int = 0       # de esas, las ya hechas
    bodega: int = 0       # prendas que salen de bodega
    esperando: int = 0    # de esas, las que esperan que llegue
    falta: List[str] = field(default_factory=list)
    listo: bool = False


def avance(cotizacion: Cotizacion, en_bodega: Dict[str, str]) -> Avance:
    """
    En qué va el pedido. `en_bodega`: {prenda_id: APARTADA o ESPERANDO}, de
    apartado.estado_en_bodega. Lo que falta y "listo" solo se calculan en un
    pedido confirmado: antes no hay nada que preparar, y después ya salió.
    """
    a = Avance()
    prendas = activas(cotizacion)
    for item in prendas:
        if item.camino == TALLER:
            a.taller += 1
            a.hechas += 1 if item.cortado else 0
        elif item.camino == BODEGA:
            a.bodega += 1
            a.esperando += 1 if en_bodega.get(item.id) == ESPERANDO else 0

    if EstadoCotizacion(getattr(cotizacion.estado, "value", cotizacion.estado)) != EstadoCotizacion.CONFIRMADA:
        return a

    for item in prendas:
        nombre = nombre_de_prenda(item)
        if item.camino == TALLER and not item.cortado:
            a.falta.append(f"{nombre}: por hacer en el taller")
        elif item.camino == BODEGA and en_bodega.get(item.id) == ESPERANDO:
            a.falta.append(f"{nombre}: esperando que llegue a bodega")
        elif item.camino is None:
            a.falta.append(f"{nombre}: sin decidir de dónde sale")
    a.listo = bool(prendas) and not a.falta
    return a
