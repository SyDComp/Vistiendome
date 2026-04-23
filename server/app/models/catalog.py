from typing import Optional, List, Dict, Any
from sqlmodel import SQLModel, Field, Relationship, JSON
from enum import Enum
from datetime import datetime
from sqlalchemy import Column, DateTime, func as sa_func

class MovementType(str, Enum):
    RECEIPT = "RECEIPT"      # Ingreso (Proveedores/Carga inicial)
    SALE = "SALE"            # Venta (Despacho real)
    RESERVATION = "RESERVATION"  # Reserva (Checkout iniciado)
    ADJUSTMENT = "ADJUSTMENT" # Ajuste manual (Merma)
    RETURN = "RETURN"        # Devolución

# --- LINK TABLES (Defined FIRST so Link Classes are available for link_model) ---
# Note: Foreign keys use strings to allow forward reference to table names defined below.

class CategoryCharacteristicLink(SQLModel, table=True):
    category_id: Optional[int] = Field(default=None, foreign_key="category.id", primary_key=True)
    characteristic_id: Optional[int] = Field(default=None, foreign_key="attribute.id", primary_key=True)

class SpecificationCharacteristicLink(SQLModel, table=True):
    specification_id: Optional[int] = Field(default=None, foreign_key="specification.id", primary_key=True)
    characteristic_id: Optional[int] = Field(default=None, foreign_key="attribute.id", primary_key=True)
    allowed_values: List[str] = Field(default=[], sa_type=JSON)

class CategorySpecificationLink(SQLModel, table=True):
    category_id: Optional[int] = Field(default=None, foreign_key="category.id", primary_key=True)
    specification_id: Optional[int] = Field(default=None, foreign_key="specification.id", primary_key=True)

# --- CORE MODELS ---

class Characteristic(SQLModel, table=True):
    __tablename__ = "attribute"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True) 
    description: Optional[str] = Field(default=None)
    is_filterable: bool = Field(default=True)
    
    value_structure: List[Dict[str, Any]] = Field(default=[], sa_type=JSON)
    domain: List[Dict[str, Any]] = Field(default=[], sa_type=JSON)
    
    # Relationships
    categories: List["Category"] = Relationship(
        back_populates="template_characteristics", 
        link_model=CategoryCharacteristicLink
    )
    specifications: List["Specification"] = Relationship(
        back_populates="characteristics",
        link_model=SpecificationCharacteristicLink
    )

class Specification(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)
    description: Optional[str] = None
    
    # Relationships
    characteristics: List["Characteristic"] = Relationship(
        back_populates="specifications",
        link_model=SpecificationCharacteristicLink
    )
    categories: List["Category"] = Relationship(
        back_populates="suggested_specifications",
        link_model=CategorySpecificationLink
    )

class Product(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    slug: str = Field(unique=True, index=True)
    description: str
    
    category_id: int = Field(foreign_key="category.id")
    category: "Category" = Relationship(back_populates="products")
    
    is_deleted: bool = Field(default=False, index=True)
    
    extras: Dict[str, Any] = Field(default={}, sa_type=JSON)
    specs: Dict[str, str] = Field(default={}, sa_type=JSON) 
    
    skus: List["SKU"] = Relationship(back_populates="product")
    images: List["ProductImage"] = Relationship(back_populates="product")

class Category(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    slug: str = Field(unique=True, index=True)
    
    parent_id: Optional[int] = Field(default=None, foreign_key="category.id")
    
    level: int = Field(default=1)
    path: str = Field(default="", index=True)
    is_filterable: bool = Field(default=True)
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=sa_func.now())
    )
    
    # Relationships
    products: List["Product"] = Relationship(back_populates="category")
    
    template_characteristics: List["Characteristic"] = Relationship(
        back_populates="categories", 
        link_model=CategoryCharacteristicLink
    )
    
    suggested_specifications: List["Specification"] = Relationship(
        back_populates="categories",
        link_model=CategorySpecificationLink
    )
    
    subcategories: List["Category"] = Relationship(
        back_populates="parent",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    parent: Optional["Category"] = Relationship(
        back_populates="subcategories",
        sa_relationship_kwargs={"remote_side": "Category.id"}
    )

class ProductOption(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    product_id: int = Field(foreign_key="product.id")
    characteristic_id: int = Field(foreign_key="attribute.id")
    allowed_values: List[str] = Field(default=[], sa_type=JSON)

class SKU(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    product_id: int = Field(foreign_key="product.id")
    sku: str = Field(unique=True, index=True)
    barcode: Optional[str] = Field(default=None, unique=True, index=True)
    
    config: Dict[str, str] = Field(default={}, sa_type=JSON)
    
    price: float
    stock: int = Field(default=0)
    image_urls: List[str] = Field(default=[], sa_type=JSON)
    
    product: "Product" = Relationship(back_populates="skus")
    movements: List["StockMovement"] = Relationship(back_populates="sku")

class StockMovement(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    sku_id: int = Field(foreign_key="sku.id")
    type: MovementType
    quantity: int # Delta (ej: +10, -1)
    
    reference_id: Optional[str] = None # ID de Orden, ID de Carga, etc.
    note: Optional[str] = None
    
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=sa_func.now())
    )
    
    sku: "SKU" = Relationship(back_populates="movements")

class ColorSwatch(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)
    hex_code: str = Field(default="#000000")
    slug: str = Field(unique=True, index=True)

class ProductImage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    product_id: int = Field(foreign_key="product.id")
    url: str
    is_main: bool = Field(default=False)
    ui_config: Dict[str, Any] = Field(default={"zoom": 1, "x": 0, "y": 0}, sa_type=JSON)
    config_match: Dict[str, str] = Field(default={}, sa_type=JSON) # E.j. {"color": "Azul"}
    
    product: "Product" = Relationship(back_populates="images")
