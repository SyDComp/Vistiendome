"""
Las opciones de una característica: crearlas, renombrarlas, reordenarlas y
quitarlas. Es el único lugar que las modifica.

El panel manda la lista entera, como la ve. Cada opción que ya existe viaja
con su id: si cambió el nombre, es la MISMA opción con otro nombre, y como
las variantes, las especificaciones y los precios por cantidad le apuntan por
id, el nombre nuevo se ve en todos lados en el mismo momento. Antes la lista
era de textos: renombrar era borrar una y crear otra, y si estaba en uso se
bloqueaba con "no se puede eliminar".
"""

from typing import Any, Dict, Iterable, List

from sqlalchemy import func, or_
from sqlmodel import Session, select

from ...models.catalog import Characteristic, EspecificacionOpcion, OpcionCaracteristica, SKUOpcion
from ...models.prendas_opciones import (
    CotizacionItemOpcion, CotizacionItemPropuesta, OrdenCorteItemOpcion, OrdenCorteItemPropuesta,
    PiezaOpcion, PiezaPropuesta,
)
from ...models.propuestas import OpcionPropuesta
from ...models.tramos import TramoPrecio
from .nombres import normalize_opt

# Lo que no es "datos" de la opción: su identidad, su nombre y su lugar.
_PROPIAS = {"id", "value", "order", "is_system"}


class OpcionesInvalidas(ValueError):
    """La lista no se puede guardar así (repetida, ajena o en uso). El mensaje es para la tienda."""


class OpcionDelSistema(PermissionError):
    """Se intentó renombrar o quitar una opción del sistema."""


def _cuantos(db: Session, tabla, condicion) -> int:
    return db.exec(select(func.count()).select_from(tabla).where(condicion)).one()


def usos_de_caracteristica(db: Session, caracteristica_id: int) -> List[str]:
    """Las propuestas de prendas que nombran la característica (sus opciones se revisan con `usos`)."""
    propuestas = sum(_cuantos(db, t, t.caracteristica_id == caracteristica_id)
                     for t in (CotizacionItemPropuesta, OrdenCorteItemPropuesta, PiezaPropuesta))
    registradas = _cuantos(db, OpcionPropuesta, OpcionPropuesta.attribute_id == caracteristica_id)
    return [texto for n, texto in (
        (propuestas, f"{propuestas} propuesta(s) de prendas"),
        (registradas, f"{registradas} opción(es) propuesta(s) por clientas"),
    ) if n]


def usos(db: Session, opcion_id: int) -> List[str]:
    """Quién usa la opción, en palabras. Vacío = se puede quitar."""
    variantes = db.exec(select(func.count()).select_from(SKUOpcion).where(SKUOpcion.opcion_id == opcion_id)).one()
    prendas = _cuantos(db, CotizacionItemOpcion, CotizacionItemOpcion.opcion_id == opcion_id)
    cortes = _cuantos(db, OrdenCorteItemOpcion, OrdenCorteItemOpcion.opcion_id == opcion_id)
    piezas = _cuantos(db, PiezaOpcion, PiezaOpcion.opcion_id == opcion_id)
    especificaciones = db.exec(
        select(func.count()).select_from(EspecificacionOpcion).where(EspecificacionOpcion.opcion_id == opcion_id)
    ).one()
    tramos = db.exec(
        select(func.count()).select_from(TramoPrecio)
        .where(or_(TramoPrecio.desde_opcion_id == opcion_id, TramoPrecio.hasta_opcion_id == opcion_id))
    ).one()
    return [texto for n, texto in (
        (variantes, f"{variantes} variante(s)"),
        (especificaciones, f"{especificaciones} especificación(es)"),
        (tramos, f"{tramos} precio(s) por cantidad"),
        (prendas, f"{prendas} prenda(s) de pedidos"),
        (cortes, f"{cortes} línea(s) de órdenes de corte"),
        (piezas, f"{piezas} pieza(s) única(s)"),
    ) if n]


def sincronizar(db: Session, caracteristica: Characteristic, lista: Iterable[Dict[str, Any]]) -> None:
    """
    Deja las opciones de la característica como dice `lista`, en ese orden.

    · Con id: es una opción que ya existe; se le actualiza nombre, orden y datos.
    · Sin id: se busca por nombre (un cliente viejo); si no está, es nueva.
    · Las que no vienen se quitan, salvo que alguien las use o sean del sistema.
    · Una fila vacía no es una opción: el panel agrega filas en blanco.
    """
    existentes = {o.id: o for o in caracteristica.opciones if o.id is not None}
    por_valor = {o.valor: o for o in caracteristica.opciones}
    vistas = set()
    valores = set()

    orden = 0
    for item in lista:
        valor = normalize_opt(item.get("value") or "")
        if not valor:
            continue
        if valor in valores:
            raise OpcionesInvalidas(f"La opción '{valor}' está repetida en {caracteristica.name}.")
        valores.add(valor)

        if item.get("id") is not None:
            opcion = existentes.get(item["id"])
            if opcion is None:
                raise OpcionesInvalidas(f"La opción '{valor}' no es de {caracteristica.name}.")
        else:
            opcion = por_valor.get(valor)
            if opcion is not None and opcion.id in vistas:
                opcion = None

        if opcion is None:
            opcion = OpcionCaracteristica(valor=valor, es_sistema=bool(item.get("is_system", False)))
            caracteristica.opciones.append(opcion)
        elif opcion.es_sistema and opcion.valor != valor:
            raise OpcionDelSistema(f"La opción de sistema '{opcion.valor}' no se puede renombrar.")

        orden += 1
        opcion.valor = valor
        opcion.orden = orden
        opcion.datos = {k: v for k, v in item.items() if k not in _PROPIAS}
        if opcion.id is not None:
            vistas.add(opcion.id)

    for opcion_id, opcion in existentes.items():
        if opcion_id in vistas:
            continue
        if opcion.es_sistema:
            raise OpcionDelSistema(f"La opción de sistema '{opcion.valor}' es inmutable y no puede ser eliminada.")
        en_uso = usos(db, opcion_id)
        if en_uso:
            raise OpcionesInvalidas(f"No se puede quitar '{opcion.valor}' de {caracteristica.name}: la usan {', '.join(en_uso)}.")
        caracteristica.opciones.remove(opcion)
