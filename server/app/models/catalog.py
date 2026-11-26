from typing import Optional, List, Dict, Any
from sqlmodel import SQLModel, Field, Relationship, JSON
from enum import Enum
from datetime import datetime
from pydantic import computed_field
from sqlalchemy import Column, DateTime, ForeignKeyConstraint, UniqueConstraint, func as sa_func


def _sin_campos_retirados(modelo: str, datos: Dict[str, Any], retirados: Dict[str, str]) -> None:
    """
    Estos campos eran texto copiado y hoy se calculan de los enlaces. El
    constructor los ignoraba EN SILENCIO: `SKU(config=...)` creaba una variante
    sin opciones. Que falle en el acto.
    """
    for campo, en_su_lugar in retirados.items():
        if campo in datos:
            raise TypeError(f"{modelo}({campo}=...) ya no existe: {en_su_lugar}.")

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

    # Las opciones que la especificación permite, por identidad (ver
    # EspecificacionOpcion). Renombrar una opción se ve aquí sin tocar nada.
    permitidas: List["EspecificacionOpcion"] = Relationship(
        sa_relationship_kwargs={
            "lazy": "selectin",
            "cascade": "all, delete-orphan",
            "primaryjoin": "and_(SpecificationCharacteristicLink.specification_id == EspecificacionOpcion.specification_id, "
                           "SpecificationCharacteristicLink.characteristic_id == EspecificacionOpcion.caracteristica_id)",
            "foreign_keys": "[EspecificacionOpcion.specification_id, EspecificacionOpcion.caracteristica_id]",
        }
    )

    def __init__(self, **datos):
        _sin_campos_retirados("SpecificationCharacteristicLink", datos,
                              {"allowed_values": "se agregan EspecificacionOpcion a .permitidas"})
        super().__init__(**datos)

    @computed_field
    @property
    def allowed_values(self) -> List[str]:
        return [e.opcion.valor for e in sorted(self.permitidas, key=lambda e: (e.opcion.orden, e.opcion.id))]

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

    # ¿Sale impresa en la orden de corte? Lo decide la clienta, característica
    # por característica. La costurera necesita talla y color; el material puede
    # sobrarle, y una columna de más en una hoja de taller es ruido.
    # Por omisión TRUE: quitar es una decisión, no un olvido. Si arrancara en
    # false, una característica nueva desaparecería de la hoja sin que nadie se
    # entere, y eso se descubre cuando la prenda ya está mal cortada.
    en_orden_corte: bool = Field(default=True)

    # En qué lugar se muestra (1, 2, 3…): la caja, la orden de corte y el
    # selector de variantes las recorren en este orden. Lo decide la tienda,
    # incluidas las del sistema. Ver core/caracteristicas/orden.py.
    orden: int = Field(default=0)
    
    is_system: bool = Field(default=False)
    system_id: Optional[str] = Field(default=None)
    
    # Qué datos tiene cada opción además de su nombre (el hex de un color, la
    # imagen de un estampado). Los valores van en OpcionCaracteristica.datos.
    value_structure: List[Dict[str, Any]] = Field(default=[], sa_type=JSON)

    # Las opciones, cada una con su identidad. Antes eran una lista de textos
    # dentro de esta fila y las variantes copiaban el texto: renombrar dejaba a
    # todos con el nombre viejo. Se modifican sólo con
    # core/caracteristicas/opciones.py.
    opciones: List["OpcionCaracteristica"] = Relationship(
        back_populates="caracteristica",
        sa_relationship_kwargs={"lazy": "selectin", "cascade": "all, delete-orphan"},
    )

    def __init__(self, **datos):
        _sin_campos_retirados("Characteristic", datos,
                              {"domain": "se usa core.caracteristicas.sincronizar"})
        super().__init__(**datos)

    @computed_field
    @property
    def domain(self) -> List[Dict[str, Any]]:
        """Las opciones como las lee el panel: {id, value, order, is_system, ...datos}."""
        return [opcion.como_dominio() for opcion in sorted(self.opciones, key=lambda o: (o.orden, o.id or 0))]

    # Relationships
    categories: List["Category"] = Relationship(
        back_populates="template_characteristics", 
        link_model=CategoryCharacteristicLink
    )
    specifications: List["Specification"] = Relationship(
        back_populates="characteristics",
        link_model=SpecificationCharacteristicLink
    )

class OpcionCaracteristica(SQLModel, table=True):
    """
    Una opción de una característica (Negro, XL, Redondo), con identidad propia.

    Las variantes, las especificaciones y los precios por cantidad le apuntan
    por su id: cambiarle el nombre se ve en todos lados en el mismo momento, y
    la base no deja borrarla mientras alguien la use.
    """
    __tablename__ = "opcion_caracteristica"
    __table_args__ = (
        UniqueConstraint("caracteristica_id", "valor", name="opcion_unica_en_su_caracteristica"),
        # Para que sku_opcion pueda exigir que la opción sea de la característica que dice.
        UniqueConstraint("id", "caracteristica_id", name="opcion_con_su_caracteristica"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    caracteristica_id: int = Field(foreign_key="attribute.id", index=True)
    valor: str
    orden: int = Field(default=0)
    # Las del sistema (las tallas y colores base) no se renombran ni se quitan.
    es_sistema: bool = Field(default=False)
    # Lo que declara value_structure además del nombre: hex_code, image_url...
    datos: Dict[str, Any] = Field(default={}, sa_type=JSON)

    caracteristica: Characteristic = Relationship(
        back_populates="opciones", sa_relationship_kwargs={"lazy": "joined"}
    )

    def como_dominio(self) -> Dict[str, Any]:
        return {**(self.datos or {}), "id": self.id, "value": self.valor, "order": self.orden, "is_system": self.es_sistema}


class SKUOpcion(SQLModel, table=True):
    """
    Qué opción tiene una variante en cada característica: una sola por
    característica, y la base exige que la opción sea de esa característica.
    """
    __tablename__ = "sku_opcion"
    __table_args__ = (
        ForeignKeyConstraint(
            ["opcion_id", "caracteristica_id"],
            ["opcion_caracteristica.id", "opcion_caracteristica.caracteristica_id"],
            name="sku_opcion_de_su_caracteristica",
        ),
    )

    sku_id: int = Field(foreign_key="sku.id", primary_key=True)
    caracteristica_id: int = Field(foreign_key="attribute.id", primary_key=True)
    opcion_id: int = Field(index=True)

    opcion: OpcionCaracteristica = Relationship(
        sa_relationship_kwargs={
            "lazy": "joined",
            "primaryjoin": "SKUOpcion.opcion_id == OpcionCaracteristica.id",
            "foreign_keys": "[SKUOpcion.opcion_id]",
        }
    )


class EspecificacionOpcion(SQLModel, table=True):
    """Una opción que una especificación permite para una de sus características."""
    __tablename__ = "especificacion_opcion"
    __table_args__ = (
        ForeignKeyConstraint(
            ["opcion_id", "caracteristica_id"],
            ["opcion_caracteristica.id", "opcion_caracteristica.caracteristica_id"],
            name="especificacion_opcion_de_su_caracteristica",
        ),
    )

    specification_id: int = Field(foreign_key="specification.id", primary_key=True)
    caracteristica_id: int = Field(foreign_key="attribute.id", primary_key=True)
    opcion_id: int = Field(primary_key=True)

    opcion: OpcionCaracteristica = Relationship(
        sa_relationship_kwargs={
            "lazy": "joined",
            "primaryjoin": "EspecificacionOpcion.opcion_id == OpcionCaracteristica.id",
            "foreign_keys": "[EspecificacionOpcion.opcion_id]",
        }
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

    # La foto de portada, de la Galería. Antes era su dirección como texto: al
    # borrar la foto no se revisaba, y al cambiarle el nombre quedaba rota.
    portada_id: Optional[int] = Field(default=None, foreign_key="mediaasset.id")
    portada: Optional["MediaAsset"] = Relationship(sa_relationship_kwargs={"lazy": "joined"})

    is_active: bool = Field(default=True)
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=sa_func.now())
    )
    
    # Relationships
    skus: List["SKU"] = Relationship(back_populates="collections", link_model=CollectionSKULink)

    def __init__(self, **datos):
        _sin_campos_retirados("Collection", datos, {"image_url": "se pasa portada_id (core.medios.foto_por_direccion)"})
        super().__init__(**datos)

    @computed_field
    @property
    def image_url(self) -> Optional[str]:
        """La dirección de hoy de la foto de portada."""
        return self.portada.url if self.portada else None

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

    # Las variantes que se venden. Una variante dada de baja no aparece acá,
    # pero no se borra: su historia (bodega, pedidos, cortes) sigue apuntándole.
    skus: List["SKU"] = Relationship(
        sa_relationship_kwargs={
            "primaryjoin": "and_(Product.id == SKU.product_id, SKU.is_deleted == False)",
            "viewonly": True,
        }
    )
    # Todas, incluidas las dadas de baja: para editar el producto y poder
    # reactivar una combinación que se había quitado.
    todas_las_skus: List["SKU"] = Relationship(back_populates="product")
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

    # CÓMO TRABAJA LA TIENDA CON LO DE ESTA CATEGORÍA (ver core/categorias)
    # Nulo = igual que su categoría padre. Una categoría principal siempre los
    # dice, salvo "Sin Categoría", cuyo abastecimiento se decide al confirmar
    # cada pedido (recibe de todo: ropa o libros).
    #
    # Cuando no hay en bodega: "TALLER" (se confecciona) o "SOLO_BODEGA".
    # Texto y no enum de la base: el encargo a proveedor llega en la Fase 3.
    abastecimiento: Optional[str] = Field(default=None, max_length=20)
    # Si la clienta puede proponer valores o características que el catálogo
    # no tiene. Si no, solo elige entre lo que existe.
    acepta_personalizacion: Optional[bool] = Field(default=None)

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
    
    # Sin cascada de borrado: al borrar una categoría, lo que colgaba de ella
    # sube un nivel (core/categorias/borrado.py). Con la cascada, el borrado se
    # llevaba el árbol entero.
    subcategories: List["Category"] = Relationship(back_populates="parent")
    parent: Optional["Category"] = Relationship(
        back_populates="subcategories",
        sa_relationship_kwargs={"remote_side": "Category.id"}
    )

class SKU(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    product_id: int = Field(foreign_key="product.id")
    sku: str = Field(unique=True, index=True)
    barcode: Optional[str] = Field(default=None, unique=True, index=True)

    # Qué opción tiene en cada característica, por identidad. Se asignan sólo
    # con core/caracteristicas/enlaces.py, que no acepta opciones inexistentes.
    opciones: List["SKUOpcion"] = Relationship(
        sa_relationship_kwargs={"lazy": "selectin", "cascade": "all, delete-orphan"}
    )

    price: float

    # --- Override de oferta a nivel variante ---
    # sale_type: 'percent' o 'fixed'. Si está activo (dentro de su ventana),
    # prevalece sobre la oferta del producto.
    sale_type: Optional[str] = Field(default=None)
    sale_value: Optional[float] = Field(default=None)
    sale_start: Optional[datetime] = Field(default=None)
    sale_end: Optional[datetime] = Field(default=None)

    # Dada de baja: ya no se vende ni se muestra, pero se conserva con su
    # historia. Ver Product.skus.
    is_deleted: bool = Field(default=False, index=True)
    product: "Product" = Relationship(back_populates="todas_las_skus")
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

    def __init__(self, **datos):
        _sin_campos_retirados("SKU", datos, {"config": "se usa core.caracteristicas.asignar"})
        super().__init__(**datos)

    @computed_field
    @property
    def config(self) -> Dict[str, str]:
        """
        {CARACTERÍSTICA: opción} con los nombres de HOY, en el orden de las
        características. Se calcula de los enlaces: no hay copia que se quede vieja.
        """
        enlaces = sorted(self.opciones, key=lambda e: (e.opcion.caracteristica.orden, e.opcion.caracteristica.id))
        return {e.opcion.caracteristica.name: e.opcion.valor for e in enlaces}

class StockMovement(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    sku_id: int = Field(foreign_key="sku.id")
    type: MovementType
    quantity: int # Delta (ej: +10, -1)
    
    # De qué hecho salió (core/movimientos.py: un hecho, un saldo). Uno de:
    #   · la prenda de un pedido (despacharla, cancelarla hecha),
    #   · la línea de una orden de corte (terminarla),
    #   · un lote: el identificador de una operación en bloque (un conteo, una
    #     partida). No apunta a otra fila: agrupa los movimientos de esa operación.
    # Antes era un solo texto con cualquiera de los tres, sin enlace.
    cotizacion_item_id: Optional[str] = Field(default=None, max_length=26, foreign_key="cotizacion_items.id", index=True)
    orden_corte_item_id: Optional[str] = Field(default=None, max_length=26, foreign_key="orden_corte_items.id", index=True)
    lote: Optional[str] = Field(default=None, max_length=40, index=True)
    note: Optional[str] = None
    
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=sa_func.now())
    )
    
    sku: "SKU" = Relationship(back_populates="movements")

    def __init__(self, **datos):
        _sin_campos_retirados("StockMovement", datos, {
            "reference_id": "se pasa cotizacion_item_id, orden_corte_item_id o lote"})
        super().__init__(**datos)

    @computed_field
    @property
    def reference_id(self) -> Optional[str]:
        """El origen, como lo lee el panel: el id de la prenda, de la línea o el lote."""
        return self.cotizacion_item_id or self.orden_corte_item_id or self.lote

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
