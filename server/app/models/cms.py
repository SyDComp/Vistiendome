from typing import Optional, Dict, Any
from sqlmodel import SQLModel, Field, JSON

class HomepageSection(SQLModel, table=True):
    """
    Representa un bloque o sección dinámica en una página específica (homepage, tallas, etc).
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    page: str = Field(default="homepage", index=True) # Identificador de la página
    type: str = Field(index=True)  # Ej: 'hero', 'carousel', 'text_post', 'banner', 'data_table'
    title: str
    config: Dict[str, Any] = Field(default={}, sa_type=JSON)
    order: int = Field(default=0)
    is_active: bool = Field(default=True)

class HelpSection(SQLModel, table=True):
    """
    Secciones restrictivas del Centro de Ayuda / Atención al Cliente.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    slug: str = Field(unique=True, index=True) # tallas, faq, cambios, envios, cuidados
    title: str
    icon: str # Emoji o nombre de icono de lucide
    order: int = Field(default=0)
    is_active: bool = Field(default=True)
