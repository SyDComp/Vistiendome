"""
Taller: las órdenes de corte.

Se separan de `crm.py` a propósito. Una cotización es una VENTA; una orden de
corte es PRODUCCIÓN, y no dependen entre sí: Paola corta para cumplir pedidos,
pero también corta para tener stock. Por eso la orden es una entidad propia y
no una vista derivada de las ventas.
"""

from datetime import datetime
from typing import Optional, List, Dict
from enum import Enum
from sqlalchemy import JSON

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

    # OPCIONAL a proposito. Una cotizacion puede llevar una pieza que no existe
    # en el catalogo —el "item libre" que arma la clienta a mano para un
    # encargo especial— y esa pieza tambien hay que cortarla. Mientras esto fue
    # obligatorio, la orden de corte no podia representarla: el pedido entraba
    # al taller sin ella y nadie la confeccionaba.
    #
    # Sin SKU, el nombre es lo unico que identifica la pieza, y la costurera
    # necesita leerlo en la planilla.
    sku_id: Optional[int] = Field(default=None, foreign_key="sku.id", index=True)
    nombre_custom: Optional[str] = Field(default=None, max_length=255)
    # Caracteristicas de la pieza personalizada, en el mismo formato que
    # SKU.config. Viajan con ella para que la planilla del taller diga que hay
    # que cortar y no solo como se llama.
    config_custom: Optional[Dict[str, str]] = Field(default=None, sa_type=JSON)
    cantidad: int = Field(default=1)

    # De dónde salió esta línea. Con pedido: al finalizar se marca esa pieza
    # como cortada. Sin pedido (None): es corte para stock, y al finalizar las
    # unidades entran al inventario. Una misma orden puede mezclar las dos.
    cotizacion_item_id: Optional[str] = Field(
        default=None, foreign_key="cotizacion_items.id", index=True, max_length=26
    )

    orden: OrdenCorte = Relationship(back_populates="items")
    sku: Optional["SKU"] = Relationship()
