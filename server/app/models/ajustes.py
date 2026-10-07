"""
Ajustes del negocio: cómo trabaja la tienda, editable desde el panel.

Son privados. Los ajustes del sitio (SiteSetting: redes, contacto) se publican
a cualquiera que abra la tienda; estos no. Por eso son otra tabla y no otra
clave de aquella.
"""

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import JSON, Column, DateTime
from sqlmodel import Field, SQLModel


class AjusteNegocio(SQLModel, table=True):
    __tablename__ = "ajustes_negocio"

    clave: str = Field(primary_key=True, max_length=60)
    valor: Any = Field(default=None, sa_type=JSON)
    actualizado_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
