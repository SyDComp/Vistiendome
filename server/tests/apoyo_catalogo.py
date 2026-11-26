"""
Para las pruebas: variantes con sus opciones de verdad.

Una variante ya no guarda {TALLA: "M"} como texto: apunta a la opción M de
la característica TALLA. Las pruebas que solo necesitan "una variante talla
M" la piden aquí, y si TALLA o M no existen se crean en la biblioteca, como
las habría creado la tienda.
"""

from typing import Dict, Iterable

from sqlmodel import Session, select

from app.core import caracteristicas
from app.models.catalog import SKU, Characteristic


def en_biblioteca(session: Session, valores: Dict[str, Iterable[str]]) -> None:
    """Deja en la biblioteca esas características con, al menos, esas opciones."""
    for nombre, opciones in valores.items():
        nombre = caracteristicas.normalize_char(nombre)
        car = session.exec(select(Characteristic).where(Characteristic.name == nombre)).first()
        if car is None:
            car = Characteristic(name=nombre, orden=caracteristicas.siguiente_orden(session))
            session.add(car)
        lista = [o.como_dominio() for o in sorted(car.opciones, key=lambda o: (o.orden, o.id or 0))]
        ya = {o["value"] for o in lista}
        lista += [{"value": v} for v in opciones if caracteristicas.normalize_opt(v) not in ya]
        caracteristicas.sincronizar(session, car, lista)
        session.flush()


def enlazar(session: Session, sku: SKU, config: Dict[str, str]) -> SKU:
    """Le pone a la variante esas opciones (creándolas en la biblioteca si faltan)."""
    en_biblioteca(session, {k: [v] for k, v in config.items() if v})
    caracteristicas.asignar(sku, caracteristicas.resolver(caracteristicas.biblioteca(session), config))
    return sku


def variante(session: Session, config: Dict[str, str], **campos) -> SKU:
    """Una variante nueva (sin guardar) con esas opciones."""
    return enlazar(session, SKU(**campos), config)
