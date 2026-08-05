from typing import Optional, Dict, Any
from datetime import datetime
from sqlmodel import SQLModel, Field, JSON


class AnalyticsEvent(SQLModel, table=True):
    """
    Evento de analítica para Inteligencia de Negocio.
    type: 'view' | 'click' | 'search' | 'add_to_cart' | 'checkout_whatsapp'
    """
    __tablename__ = "analytics_event"

    id: Optional[int] = Field(default=None, primary_key=True)
    type: str = Field(index=True)
    product_id: Optional[int] = Field(default=None, index=True)
    sku: Optional[str] = Field(default=None, index=True)
    query: Optional[str] = Field(default=None)
    session_id: Optional[str] = Field(default=None, index=True)
    meta: Dict[str, Any] = Field(default={}, sa_type=JSON)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
