from typing import Optional, Dict, Any
from datetime import datetime
from sqlmodel import SQLModel, Field, JSON
from sqlalchemy import Column, ForeignKey, Integer


class AnalyticsEvent(SQLModel, table=True):
    """
    Evento de analítica para Inteligencia de Negocio.
    type: 'view' | 'click' | 'search' | 'add_to_cart' | 'checkout_whatsapp'
    """
    __tablename__ = "analytics_event"

    id: Optional[int] = Field(default=None, primary_key=True)
    type: str = Field(index=True)
    # El producto y la variante, por identidad. Antes la variante era su código:
    # si el código cambiaba (al renombrar el producto), sus cifras se partían en
    # dos. Al borrarse el producto o la variante, el evento queda sin ella: una
    # estadística no impide borrar nada.
    product_id: Optional[int] = Field(
        default=None, sa_column=Column(Integer, ForeignKey("product.id", ondelete="SET NULL"), index=True))
    sku_id: Optional[int] = Field(
        default=None, sa_column=Column(Integer, ForeignKey("sku.id", ondelete="SET NULL"), index=True))
    query: Optional[str] = Field(default=None)
    session_id: Optional[str] = Field(default=None, index=True)
    meta: Dict[str, Any] = Field(default={}, sa_type=JSON)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
