"""
Las características de una prenda que no es una variante del catálogo: una
prenda a medida de un pedido, su línea en la orden de corte y la pieza única
que sale de ella.

  · Opción: una opción de la biblioteca, por identidad (como SKUOpcion).
  · Propuesta: lo que la clienta pidió y no existía. La característica va por
    identidad; el valor es texto, porque es justamente lo que no existe. Sigue
    siendo propuesta aunque después se apruebe: el pedido dice lo que pasó.

Antes eran {"TALLA": "M"} como texto en cada prenda: renombrar una
característica dejaba la planilla del taller con el nombre viejo.
"""

from typing import Dict

from sqlalchemy import ForeignKeyConstraint
from sqlmodel import Field, Relationship, SQLModel

from .catalog import Characteristic, OpcionCaracteristica


def _fk_opcion(nombre: str) -> ForeignKeyConstraint:
    """La opción tiene que ser de la característica que dice la fila."""
    return ForeignKeyConstraint(
        ["opcion_id", "caracteristica_id"],
        ["opcion_caracteristica.id", "opcion_caracteristica.caracteristica_id"],
        name=nombre,
    )


def como_config(enlaces) -> Dict[str, str]:
    """{CARACTERÍSTICA: opción} con los nombres de hoy, en el orden de las características."""
    ordenados = sorted(enlaces, key=lambda e: (e.opcion.caracteristica.orden, e.opcion.caracteristica.id))
    return {e.opcion.caracteristica.name: e.opcion.valor for e in ordenados}


def como_propuesta(propuestas) -> Dict[str, str]:
    """{CARACTERÍSTICA: lo propuesto}, con el nombre de hoy de la característica."""
    ordenadas = sorted(propuestas, key=lambda p: (p.caracteristica.orden, p.caracteristica.id))
    return {p.caracteristica.name: p.valor for p in ordenadas}


class CotizacionItemOpcion(SQLModel, table=True):
    __tablename__ = "cotizacion_item_opcion"
    __table_args__ = (_fk_opcion("cotizacion_item_opcion_de_su_caracteristica"),)

    item_id: str = Field(foreign_key="cotizacion_items.id", primary_key=True, max_length=26)
    caracteristica_id: int = Field(foreign_key="attribute.id", primary_key=True)
    opcion_id: int = Field(index=True)
    opcion: OpcionCaracteristica = Relationship(sa_relationship_kwargs={
        "lazy": "joined", "primaryjoin": "CotizacionItemOpcion.opcion_id == OpcionCaracteristica.id",
        "foreign_keys": "[CotizacionItemOpcion.opcion_id]"})


class CotizacionItemPropuesta(SQLModel, table=True):
    __tablename__ = "cotizacion_item_propuesta"

    item_id: str = Field(foreign_key="cotizacion_items.id", primary_key=True, max_length=26)
    caracteristica_id: int = Field(foreign_key="attribute.id", primary_key=True)
    valor: str = Field(max_length=120)
    caracteristica: Characteristic = Relationship(sa_relationship_kwargs={"lazy": "joined"})


class OrdenCorteItemOpcion(SQLModel, table=True):
    __tablename__ = "orden_corte_item_opcion"
    __table_args__ = (_fk_opcion("orden_corte_item_opcion_de_su_caracteristica"),)

    item_id: str = Field(foreign_key="orden_corte_items.id", primary_key=True, max_length=26)
    caracteristica_id: int = Field(foreign_key="attribute.id", primary_key=True)
    opcion_id: int = Field(index=True)
    opcion: OpcionCaracteristica = Relationship(sa_relationship_kwargs={
        "lazy": "joined", "primaryjoin": "OrdenCorteItemOpcion.opcion_id == OpcionCaracteristica.id",
        "foreign_keys": "[OrdenCorteItemOpcion.opcion_id]"})


class OrdenCorteItemPropuesta(SQLModel, table=True):
    __tablename__ = "orden_corte_item_propuesta"

    item_id: str = Field(foreign_key="orden_corte_items.id", primary_key=True, max_length=26)
    caracteristica_id: int = Field(foreign_key="attribute.id", primary_key=True)
    valor: str = Field(max_length=120)
    caracteristica: Characteristic = Relationship(sa_relationship_kwargs={"lazy": "joined"})


class PiezaOpcion(SQLModel, table=True):
    __tablename__ = "pieza_opcion"
    __table_args__ = (_fk_opcion("pieza_opcion_de_su_caracteristica"),)

    pieza_id: str = Field(foreign_key="piezas_unicas.id", primary_key=True, max_length=26)
    caracteristica_id: int = Field(foreign_key="attribute.id", primary_key=True)
    opcion_id: int = Field(index=True)
    opcion: OpcionCaracteristica = Relationship(sa_relationship_kwargs={
        "lazy": "joined", "primaryjoin": "PiezaOpcion.opcion_id == OpcionCaracteristica.id",
        "foreign_keys": "[PiezaOpcion.opcion_id]"})


class PiezaPropuesta(SQLModel, table=True):
    __tablename__ = "pieza_propuesta"

    pieza_id: str = Field(foreign_key="piezas_unicas.id", primary_key=True, max_length=26)
    caracteristica_id: int = Field(foreign_key="attribute.id", primary_key=True)
    valor: str = Field(max_length=120)
    caracteristica: Characteristic = Relationship(sa_relationship_kwargs={"lazy": "joined"})
