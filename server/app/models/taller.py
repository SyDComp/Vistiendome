"""
Taller: las órdenes de corte.

Se separan de `crm.py` a propósito. Una cotización es una VENTA; una orden de
corte es PRODUCCIÓN, y no dependen entre sí: Paola corta para cumplir pedidos,
pero también corta para tener stock. Por eso la orden es una entidad propia y
no una vista derivada de las ventas.
"""

from datetime import datetime
from typing import Optional, List
from enum import Enum

from sqlmodel import SQLModel, Field, Relationship
import ulid


def generate_ulid() -> str:
    return str(ulid.ULID())


class EstadoOrdenCorte(str, Enum):
    PENDIENTE = "PENDIENTE"
    EN_PROCESO = "EN_PROCESO"
    FINALIZADA = "FINALIZADA"
    CANCELADA = "CANCELADA"


class OrdenCorte(SQLModel, table=True):
    __tablename__ = "ordenes_corte"

    id: str = Field(default_factory=generate_ulid, primary_key=True, max_length=26)

    # Correlativo humano, igual que en las cotizaciones: nadie dicta un ULID por
    # teléfono ni lo escribe en una hoja del taller.
    numero: Optional[int] = Field(default=None, unique=True, index=True)

    estado: EstadoOrdenCorte = Field(default=EstadoOrdenCorte.PENDIENTE, index=True)
    notas: Optional[str] = Field(default=None)

    # Si esta orden nació de repetir otra, queda apuntado. Con eso se puede
    # responder "esta orden ya se hizo 4 veces" sin construir nada aparte.
    repetida_de_id: Optional[str] = Field(default=None, foreign_key="ordenes_corte.id", max_length=26)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    # Cuándo se terminó de cortar. Se llena sola al pasar a FINALIZADA.
    finalizada_at: Optional[datetime] = Field(default=None)

    items: List["OrdenCorteItem"] = Relationship(back_populates="orden")


class OrdenCorteItem(SQLModel, table=True):
    __tablename__ = "orden_corte_items"

    id: str = Field(default_factory=generate_ulid, primary_key=True, max_length=26)
    orden_id: str = Field(foreign_key="ordenes_corte.id", index=True, max_length=26)

    sku_id: int = Field(foreign_key="sku.id", index=True)
    cantidad: int = Field(default=1)

    # De dónde salió esta línea. Con pedido: al finalizar se marca esa pieza
    # como cortada. Sin pedido (None): es corte para stock, y al finalizar las
    # unidades entran al inventario. Una misma orden puede mezclar las dos.
    cotizacion_item_id: Optional[str] = Field(
        default=None, foreign_key="cotizacion_items.id", index=True, max_length=26
    )

    orden: OrdenCorte = Relationship(back_populates="items")
    sku: Optional["SKU"] = Relationship()
