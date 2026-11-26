"""
Las características de una prenda a medida: la de un pedido, su línea en la
orden de corte y la pieza única que sale de ella.

Llegan como siempre, {CARACTERÍSTICA: valor}, en dos partes: lo elegido del
catálogo y lo que la clienta propuso. Aquí quedan enlazadas:

  · Lo elegido que existe en la biblioteca → la opción, por identidad.
  · Lo elegido que NO existe → propuesta: no está en el catálogo, que es lo
    que significa proponer. Antes se guardaba como si existiera.
  · Lo propuesto → propuesta, con su característica por identidad.
  · Una característica que no existe se rechaza: es una página vieja (una
    característica renombrada), y guardarla sería un texto que nadie entiende.
"""

from typing import List, Mapping, Optional, Tuple

from sqlmodel import Session

from ...models.catalog import Characteristic, OpcionCaracteristica
from ...models.crm import CotizacionItem
from ...models.piezas import PiezaUnica
from ...models.prendas_opciones import (
    CotizacionItemOpcion, CotizacionItemPropuesta, OrdenCorteItemOpcion,
    OrdenCorteItemPropuesta, PiezaOpcion, PiezaPropuesta,
)
from ...models.taller import OrdenCorteItem
from .enlaces import Biblioteca, OpcionInexistente, biblioteca
from .nombres import normalize_char, normalize_opt

_ENLACES = {
    CotizacionItem: (CotizacionItemOpcion, CotizacionItemPropuesta),
    OrdenCorteItem: (OrdenCorteItemOpcion, OrdenCorteItemPropuesta),
    PiezaUnica: (PiezaOpcion, PiezaPropuesta),
}


def _caracteristica(libro: Biblioteca, nombre: str):
    clave = normalize_char(nombre)
    if clave not in libro:
        raise OpcionInexistente(
            f"La característica '{nombre}' ya no existe en el catálogo. Recarga la página y vuelve a elegir."
        )
    return libro[clave]


def separar(
    libro: Biblioteca, elegido: Optional[Mapping[str, str]], propuesto: Optional[Mapping[str, str]]
) -> Tuple[List[OpcionCaracteristica], List[Tuple[Characteristic, str]]]:
    """Las opciones del catálogo y las propuestas. Una característica propuesta reemplaza a la elegida."""
    opciones = {}
    propuestas = {}
    for nombre, valor in (elegido or {}).items():
        valor = str(valor or "").strip()
        if not valor:
            continue
        caracteristica, por_valor = _caracteristica(libro, nombre)
        opcion = por_valor.get(normalize_opt(valor))
        if opcion is not None:
            opciones[caracteristica.id] = opcion
        else:
            propuestas[caracteristica.id] = (caracteristica, valor)
    for nombre, valor in (propuesto or {}).items():
        valor = str(valor or "").strip()
        if not valor:
            continue
        caracteristica, _ = _caracteristica(libro, nombre)
        opciones.pop(caracteristica.id, None)
        propuestas[caracteristica.id] = (caracteristica, valor)
    return list(opciones.values()), list(propuestas.values())


def vestir(
    db: Session, prenda, elegido: Optional[Mapping[str, str]], propuesto: Optional[Mapping[str, str]],
    libro: Optional[Biblioteca] = None,
) -> None:
    """Le pone a la prenda sus características. Solo al crearla: no reemplaza enlaces guardados."""
    opciones, propuestas = separar(libro or biblioteca(db), elegido, propuesto)
    clase_opcion, clase_propuesta = _ENLACES[type(prenda)]
    prenda.opciones = [clase_opcion(caracteristica_id=o.caracteristica_id, opcion_id=o.id, opcion=o) for o in opciones]
    prenda.propuestas = [clase_propuesta(caracteristica_id=c.id, valor=v, caracteristica=c) for c, v in propuestas]
