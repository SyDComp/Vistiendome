from typing import Optional, Dict, Any
from sqlmodel import SQLModel, Field, JSON

class SiteSetting(SQLModel, table=True):
    """
    Configuraciones globales del sitio: RRSS, Contacto, Metadatos SEO, etc.
    Se almacena como key-value para máxima flexibilidad.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    key: str = Field(unique=True, index=True) # Ej: 'social_links', 'contact_info'
    value: Dict[str, Any] = Field(default={}, sa_type=JSON)
