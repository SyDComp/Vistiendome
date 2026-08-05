from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship
from enum import Enum
import ulid

def generate_ulid() -> str:
    return str(ulid.ULID())

class EstadoCotizacion(str, Enum):
    NUEVA = "NUEVA"
    EN_PROCESO = "EN_PROCESO"
    CERRADA_EXITO = "CERRADA_EXITO"
    CERRADA_PERDIDA = "CERRADA_PERDIDA"

class OrigenCotizacion(str, Enum):
    CATALOGO = "CATALOGO"
    CONTACTO_INDIVIDUAL = "CONTACTO_INDIVIDUAL"
    CONTACTO_GRUPAL = "CONTACTO_GRUPAL"
    MANUAL = "MANUAL"

class TipoDespacho(str, Enum):
    DOMICILIO = "DOMICILIO"
    SUCURSAL = "SUCURSAL"


class Cotizacion(SQLModel, table=True):
    __tablename__ = "cotizaciones"
    
    id: str = Field(default_factory=generate_ulid, primary_key=True, max_length=26)
    persona_id: str = Field(foreign_key="personas.id", index=True, max_length=26)
    
    origen: OrigenCotizacion = Field(default=OrigenCotizacion.CATALOGO)
    estado: EstadoCotizacion = Field(default=EstadoCotizacion.NUEVA)
    
    # Datos de Contacto/Mensaje
    mensaje: Optional[str] = Field(default=None)
    tipo_grupo: Optional[str] = Field(default=None)
    cantidad_aprox: Optional[int] = Field(default=None)
    fecha_evento: Optional[str] = Field(default=None)
    
    # Etiqueta de Envío
    transporte: Optional[str] = Field(default=None, max_length=100)
    tipo_despacho: Optional[TipoDespacho] = Field(default=None)
    region: Optional[str] = Field(default=None, max_length=100)
    comuna: Optional[str] = Field(default=None, max_length=100)
    direccion: Optional[str] = Field(default=None, max_length=255) # O 'Sucursal Chillan' si es a sucursal
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    persona: "Persona" = Relationship(back_populates="cotizaciones")
    items: List["CotizacionItem"] = Relationship(back_populates="cotizacion")

class CotizacionItem(SQLModel, table=True):
    __tablename__ = "cotizacion_items"
    
    id: str = Field(default_factory=generate_ulid, primary_key=True, max_length=26)
    cotizacion_id: str = Field(foreign_key="cotizaciones.id", index=True, max_length=26)
    
    sku_id: Optional[int] = Field(default=None, foreign_key="sku.id", index=True)
    cantidad: int = Field(default=1)
    precio_unitario_estimado: float = Field(default=0.0)
    nombre_custom: Optional[str] = Field(default=None, max_length=255)
    
    # Relationships
    cotizacion: Cotizacion = Relationship(back_populates="items")
    sku: Optional["SKU"] = Relationship(back_populates="cotizacion_items")
