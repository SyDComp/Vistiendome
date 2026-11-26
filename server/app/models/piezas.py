"""
Piezas únicas: prendas hechas que no son una variante del catálogo.

Nacen cuando se cancela una prenda personalizada que el taller ya hizo. Lo del
catálogo vuelve a su variante en bodega; lo personalizado no tiene variante a
la que volver, y sin esto quedaba en el limbo: existía en el taller y el
sistema no la contaba en ninguna parte.

Una fila es UNA prenda física: una línea de 3 personalizadas hechas y
canceladas son 3 piezas, porque se venden de a una.
"""

from pydantic import computed_field
from .catalog import _sin_campos_retirados
from .prendas_opciones import como_config, como_propuesta
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional

from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlmodel import Field, Relationship, SQLModel
import ulid


def _ahora() -> datetime:
    return datetime.now(timezone.utc)


class EstadoPieza(str, Enum):
    DISPONIBLE = "DISPONIBLE"   # en bodega, se puede asignar a un pedido
    APARTADA = "APARTADA"       # asignada a un pedido que todavía no sale
    VENDIDA = "VENDIDA"         # salió con ese pedido
    BAJA = "BAJA"               # se regaló, se desarmó o se perdió (con nota)


class PiezaUnica(SQLModel, table=True):
    __tablename__ = "piezas_unicas"

    id: str = Field(default_factory=lambda: str(ulid.ULID()), primary_key=True, max_length=26)
    # "Pieza única N° 4": lo que se dice y se escribe en una etiqueta.
    numero: Optional[int] = Field(default=None, unique=True, index=True)

    nombre: str = Field(max_length=255)
    producto_id: Optional[int] = Field(default=None, foreign_key="product.id")
    # Lo que tiene, en el mismo formato que una variante ({"TALLA": "M"}), y
    # cuáles de esos valores se propusieron y no existen en el catálogo.

    # De qué prenda de qué pedido salió. El número se copia: si ese pedido se
    # borra, la pieza sigue diciendo de dónde vino.
    origen_item_id: Optional[str] = Field(
        default=None,
        sa_column=Column(String(26), ForeignKey("cotizacion_items.id", ondelete="SET NULL"), nullable=True, index=True),
    )
    origen_pedido_numero: Optional[int] = Field(default=None)

    # Texto y no un ENUM de la base: agregar un estado no pide migración, y los
    # valores válidos los dice EstadoPieza.
    estado: EstadoPieza = Field(
        default=EstadoPieza.DISPONIBLE,
        sa_column=Column(String(12), nullable=False, index=True, default=EstadoPieza.DISPONIBLE.value),
    )
    # Por qué se dio de baja. Solo en BAJA.
    nota: Optional[str] = Field(default=None, max_length=500)

    creada_en: datetime = Field(default_factory=_ahora, sa_column=Column(DateTime(timezone=True), nullable=False))
    actualizada_en: datetime = Field(default_factory=_ahora, sa_column=Column(DateTime(timezone=True), nullable=False))

    # Sus características, por identidad (models/prendas_opciones.py). Se
    # asignan con core.caracteristicas.vestir.
    opciones: List["PiezaOpcion"] = Relationship(
        sa_relationship_kwargs={"lazy": "selectin", "cascade": "all, delete-orphan"}
    )
    propuestas: List["PiezaPropuesta"] = Relationship(
        sa_relationship_kwargs={"lazy": "selectin", "cascade": "all, delete-orphan"}
    )

    def __init__(self, **datos):
        _sin_campos_retirados("PiezaUnica", datos, {
            "config": "se usa core.caracteristicas.vestir",
            "config_propuesta": "se usa core.caracteristicas.vestir",
        })
        super().__init__(**datos)

    @computed_field
    @property
    def config(self) -> Dict[str, str]:
        """Las opciones del catálogo que tiene, con los nombres de hoy."""
        return como_config(self.opciones) or {}

    @computed_field
    @property
    def config_propuesta(self) -> Dict[str, str]:
        """Lo que la clienta pidió y no existía, con el nombre de hoy de su característica."""
        return como_propuesta(self.propuestas) or {}
