"""
Qué opción tiene cada variante en cada característica.

El panel sigue mandando {CARACTERÍSTICA: opción} con los nombres. Aquí se
traducen a las opciones de verdad de la biblioteca y la variante queda
enlazada por identidad. Lo que no existe en la biblioteca se rechaza: antes
se guardaba tal cual y la variante quedaba con un texto que nada más tenía.
"""

from typing import Dict, List, Mapping, Tuple

from sqlmodel import Session, select

from ...models.catalog import SKU, Characteristic, OpcionCaracteristica, SKUOpcion
from .nombres import normalize_char, normalize_opt


class OpcionInexistente(ValueError):
    """La variante pide una característica u opción que la biblioteca no tiene. El mensaje es para la tienda."""


Biblioteca = Dict[str, Tuple[Characteristic, Dict[str, OpcionCaracteristica]]]


def biblioteca(db: Session) -> Biblioteca:
    """Todas las características con sus opciones, por nombre. Una sola lectura para muchas variantes."""
    return {
        c.name: (c, {o.valor: o for o in c.opciones})
        for c in db.exec(select(Characteristic)).all()
    }


def resolver(libro: Biblioteca, config: Mapping[str, str]) -> List[OpcionCaracteristica]:
    """
    Las opciones que dice `config`, o OpcionInexistente con lo que falta.
    Un valor vacío es "sin esa característica", no una opción.
    """
    opciones = []
    for nombre, valor in config.items():
        valor = normalize_opt(valor or "")
        if not valor:
            continue
        nombre = normalize_char(nombre)
        if nombre not in libro:
            raise OpcionInexistente(f"La característica '{nombre}' no existe. Créala en Características antes de usarla.")
        caracteristica, por_valor = libro[nombre]
        if valor not in por_valor:
            raise OpcionInexistente(f"'{valor}' no es una opción de {caracteristica.name}. Agrégala en Características antes de usarla.")
        opciones.append(por_valor[valor])
    return opciones


def asignar(sku: SKU, opciones: List[OpcionCaracteristica]) -> None:
    """
    Deja la variante con exactamente esas opciones. Se actualiza en el lugar
    (no se borra y se vuelve a crear) para que cambiar de Negro a Azul sea un
    cambio de la misma fila.
    """
    actuales = {enlace.caracteristica_id: enlace for enlace in sku.opciones}
    nuevas = {o.caracteristica_id: o for o in opciones}
    for caracteristica_id, enlace in list(actuales.items()):
        if caracteristica_id not in nuevas:
            sku.opciones.remove(enlace)
    for caracteristica_id, opcion in nuevas.items():
        enlace = actuales.get(caracteristica_id)
        if enlace is None:
            sku.opciones.append(SKUOpcion(caracteristica_id=caracteristica_id, opcion_id=opcion.id, opcion=opcion))
        else:
            enlace.opcion_id = opcion.id
            enlace.opcion = opcion
