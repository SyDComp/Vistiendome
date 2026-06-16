from typing import List, Optional
from sqlmodel import SQLModel, Field, Relationship

class Region(SQLModel, table=True):
    __tablename__ = "regiones"
    id: int = Field(primary_key=True)
    nombre: str = Field(max_length=100)
    
    comunas: List["Comuna"] = Relationship(back_populates="region")

class Comuna(SQLModel, table=True):
    __tablename__ = "comunas"
    id: int = Field(primary_key=True)
    nombre: str = Field(max_length=100)
    region_id: int = Field(foreign_key="regiones.id", index=True)
    
    region: Region = Relationship(back_populates="comunas")
    direcciones: List["Direccion"] = Relationship(back_populates="comuna")

# Se usa import tardío para Direccion
