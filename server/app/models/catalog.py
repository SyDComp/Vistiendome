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

class ProductMediaLink(SQLModel, table=True):
    product_id: Optional[int] = Field(default=None, foreign_key="product.id", primary_key=True)
    media_asset_id: Optional[int] = Field(default=None, foreign_key="mediaasset.id", primary_key=True)
    is_main: bool = Field(default=False)
    ui_config: Dict[str, Any] = Field(default={"zoom": 1, "x": 0, "y": 0}, sa_type=JSON)

class SKUMediaLink(SQLModel, table=True):
    sku_id: Optional[int] = Field(default=None, foreign_key="sku.id", primary_key=True)
    media_asset_id: Optional[int] = Field(default=None, foreign_key="mediaasset.id", primary_key=True)

class CollectionSKULink(SQLModel, table=True):
    collection_id: Optional[int] = Field(default=None, foreign_key="collection.id", primary_key=True)
    sku_id: Optional[int] = Field(default=None, foreign_key="sku.id", primary_key=True)

# --- CORE MODELS ---

class Characteristic(SQLModel, table=True):
    __tablename__ = "attribute"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True)
    description: Optional[str] = Field(default=None)
    is_filterable: bool = Field(default=True)

    # ¿Cambia cómo se ve la prenda? Define qué separa una tarjeta de otra en el
    # explorador: dos variantes que sólo difieren en características NO visuales
    # (talla) son el mismo look. Lo declara la clienta desde el panel, igual que
    # is_filterable — el sistema no puede adivinarlo: hoy es Color y Estampado,
    # mañana será Idioma o Tapa cuando entren las biblias.
    afecta_apariencia: bool = Field(default=False)
    
    is_system: bool = Field(default=False)
    system_id: Optional[str] = Field(default=None)
    
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

class Collection(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)
    slug: str = Field(unique=True, index=True)
    description: Optional[str] = None
    image_url: Optional[str] = None
    
    is_active: bool = Field(default=True)
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=sa_func.now())
    )
    
    # Relationships
    skus: List["SKU"] = Relationship(back_populates="collections", link_model=CollectionSKULink)

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

    # --- Oferta temporal a nivel producto (aplica a TODAS sus variantes) ---
    # sale_type: 'percent' (sale_value = % 0-100) o 'fixed' (sale_value = precio rebajado).
    # Un SKU puede sobrescribir esto con su propia oferta.
    sale_type: Optional[str] = Field(default=None)
    sale_value: Optional[float] = Field(default=None)
    sale_start: Optional[datetime] = Field(default=None)
    sale_end: Optional[datetime] = Field(default=None)

    skus: List["SKU"] = Relationship(back_populates="product")
    media_assets: List["MediaAsset"] = Relationship(
        back_populates="products",
        link_model=ProductMediaLink
    )

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

class SKU(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    product_id: int = Field(foreign_key="product.id")
    sku: str = Field(unique=True, index=True)
    barcode: Optional[str] = Field(default=None, unique=True, index=True)
    
    config: Dict[str, str] = Field(default={}, sa_type=JSON)
    
    price: float

    # --- Override de oferta a nivel variante ---
    # sale_type: 'percent' o 'fixed'. Si está activo (dentro de su ventana),
    # prevalece sobre la oferta del producto.
    sale_type: Optional[str] = Field(default=None)
    sale_value: Optional[float] = Field(default=None)
    sale_start: Optional[datetime] = Field(default=None)
    sale_end: Optional[datetime] = Field(default=None)

    product: "Product" = Relationship(back_populates="skus")
    movements: List["StockMovement"] = Relationship(back_populates="sku")
    media_assets: List["MediaAsset"] = Relationship(
        back_populates="skus",
        link_model=SKUMediaLink
    )
    collections: List["Collection"] = Relationship(
        back_populates="skus",
        link_model=CollectionSKULink
    )
    
    cotizacion_items: List["CotizacionItem"] = Relationship(back_populates="sku")

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

class MediaAsset(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    filename: str = Field(unique=True, index=True)
    original_name: str
    alias: Optional[str] = Field(default=None)  # nombre amigable editable
    url: str
    mime_type: Optional[str] = None
    file_size: Optional[int] = None
    metadata_json: Dict[str, Any] = Field(default={}, sa_type=JSON)
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=sa_func.now())
    )
    
    products: List["Product"] = Relationship(
        back_populates="media_assets",
        link_model=ProductMediaLink
    )
    skus: List["SKU"] = Relationship(
        back_populates="media_assets",
        link_model=SKUMediaLink
    )
