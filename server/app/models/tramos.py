"""
Los precios por cantidad (mayorista, iglesia...): desde N unidades del mismo
producto, el precio baja.

Antes eran un ajuste del sitio en JSON con el NOMBRE de la característica y
de las opciones del rango: renombrar "CUELLO" dejaba el tramo apuntando a
algo que ya no existía. Ahora apuntan por identidad a la característica, a
las opciones de su rango y a sus productos. El panel los sigue leyendo y
guardando como antes, por el ajuste `price_tiers` (core/tramos).
"""

from typing import List, Optional

from sqlmodel import Field, Relationship, SQLModel

from .catalog import Characteristic, OpcionCaracteristica, Product


class TramoPrecio(SQLModel, table=True):
    __tablename__ = "tramo_precio"

    id: Optional[int] = Field(default=None, primary_key=True)
    # En qué lugar se muestra en el panel.
    orden: int = Field(default=0)
    nombre: str = Field(default="")
    # Vacía mientras la tienda lo está armando: un tramo sin característica no descuenta.
    caracteristica_id: Optional[int] = Field(default=None, foreign_key="attribute.id")
    # El rango de opciones; sin desde ni hasta, vale para todas.
    desde_opcion_id: Optional[int] = Field(default=None, foreign_key="opcion_caracteristica.id")
    hasta_opcion_id: Optional[int] = Field(default=None, foreign_key="opcion_caracteristica.id")
    min_unidades: int = Field(default=0)
    # 'percent', 'amount' o 'fixed', como en el panel.
    tipo_descuento: str = Field(default="percent")
    valor_descuento: float = Field(default=0)
    activo: bool = Field(default=True)

    caracteristica: Optional[Characteristic] = Relationship(sa_relationship_kwargs={"lazy": "joined"})
    desde: Optional[OpcionCaracteristica] = Relationship(
        sa_relationship_kwargs={"lazy": "joined", "foreign_keys": "[TramoPrecio.desde_opcion_id]"}
    )
    hasta: Optional[OpcionCaracteristica] = Relationship(
        sa_relationship_kwargs={"lazy": "joined", "foreign_keys": "[TramoPrecio.hasta_opcion_id]"}
    )
    productos: List["TramoProducto"] = Relationship(
        sa_relationship_kwargs={"lazy": "selectin", "cascade": "all, delete-orphan"}
    )


class TramoProducto(SQLModel, table=True):
    """Un producto al que se aplica el tramo. Sin ninguno, vale para todo el catálogo."""
    __tablename__ = "tramo_producto"

    tramo_id: int = Field(foreign_key="tramo_precio.id", primary_key=True)
    product_id: int = Field(foreign_key="product.id", primary_key=True)
