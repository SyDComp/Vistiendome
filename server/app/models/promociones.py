"""
Las promociones del carrito: «Lleva X, paga Y» o «Regalo por compra».

Antes eran un ajuste del sitio en JSON con los productos como números
sueltos, sin enlace: un producto que ya no existe seguía nombrado. Ahora
apuntan a sus productos por identidad. El panel las sigue leyendo y
guardando como el ajuste `promotions` (core/promociones).
"""

from datetime import date
from typing import List, Optional

from sqlmodel import Field, Relationship, SQLModel


class Promocion(SQLModel, table=True):
    __tablename__ = "promocion"

    id: Optional[int] = Field(default=None, primary_key=True)
    orden: int = Field(default=0)
    nombre: str = Field(default="")
    # 'cantidad' (lleva X, paga Y) o 'regalo' (por un mínimo de unidades o de monto).
    tipo: str = Field(default="cantidad")
    lleva: int = Field(default=0)
    paga: int = Field(default=0)
    # Cuánto se descuenta a las unidades que no se pagan: 100 = gratis, 50 = mitad.
    descuento: int = Field(default=0)
    min_unidades: int = Field(default=0)
    min_monto: int = Field(default=0)
    regalo_texto: str = Field(default="")
    desde: Optional[date] = Field(default=None)
    hasta: Optional[date] = Field(default=None)
    combinable: bool = Field(default=False)
    activa: bool = Field(default=True)

    productos: List["PromocionProducto"] = Relationship(
        sa_relationship_kwargs={"lazy": "selectin", "cascade": "all, delete-orphan"}
    )


class PromocionProducto(SQLModel, table=True):
    """Un producto al que se aplica la promoción. Sin ninguno, vale para todo el catálogo."""
    __tablename__ = "promocion_producto"

    promocion_id: int = Field(foreign_key="promocion.id", primary_key=True)
    product_id: int = Field(foreign_key="product.id", primary_key=True)
