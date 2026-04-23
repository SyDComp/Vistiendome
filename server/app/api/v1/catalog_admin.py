from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Response, UploadFile, File, Request
from sqlmodel import Session, select, func, delete, or_, and_, cast, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.exc import IntegrityError
from ...database import get_session
from ...models.catalog import (
    Product, Category, SKU, ProductImage, 
    Characteristic, Specification, SpecificationCharacteristicLink, CategorySpecificationLink,
    StockMovement, MovementType, ColorSwatch
)
import string

def normalize_char(text: str) -> str:
    """Normaliza características a MAYÚSCULAS"""
    if not text: return ""
    return text.strip().upper()

def normalize_opt(text: str) -> str:
    """Normaliza opciones a Mayúscula Cada Palabra"""
    if not text: return ""
    # string.capwords asegura que cada palabra empiece con mayúscula y el resto minúscula
    return string.capwords(text.strip().lower())

from ...core import inventory_core
from pydantic import BaseModel
import re
import unicodedata
from ...core.config import settings

router = APIRouter()

# --- SCHEMAS DE ENTRADA ---

class SKUCreate(BaseModel):
    sku: str
    barcode: Optional[str] = None
    price: float
    stock: int
    config: Dict[str, str]
    image_urls: List[str] = []

class ImageCreate(BaseModel):
    url: str
    is_main: bool = False
    ui_config: Dict[str, Any] = {"zoom": 1, "x": 0, "y": 0}
    config_match: Dict[str, str] = {}

class ProductCreate(BaseModel):
    name: str
    slug: str
    description: str
    category_id: int
    extras: Dict[str, Any] = {}
    specs: Dict[str, str] = {}
    skus: List[SKUCreate] = []
    images: List[ImageCreate] = []

class VariantGenRequest(BaseModel):
    product_name: str
    category_id: int
    attributes: List[Dict[str, Any]]

class SpecificationCreate(BaseModel):
    name: str
    description: Optional[str] = None
    characteristics: List[Dict[str, Any]] = [] # [{"id": int, "allowed_values": List[str]}]
    characteristic_ids: List[int] = [] # Legacy compatibility
    category_ids: List[int] = []

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[int] = None
    is_filterable: Optional[bool] = None
    suggested_specification_ids: List[int] = []

class ColorSwatchCreate(BaseModel):
    name: str
    hex_code: str

class StockMovementCreate(BaseModel):
    sku_id: int
    type: MovementType
    quantity: int
    note: Optional[str] = None
    reference_id: Optional[str] = None

# --- HELPER: Obtener IDs de descendientes de una categoría ---

def slugify(text: str) -> str:
    """Convierte texto a un slug amigable para URL usando _ para espacios."""
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('utf-8')
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    text = re.sub(r'[\s-]+', '_', text).strip('_')
    return text

def get_descendant_ids(db: Session, category_id: int) -> List[int]:
    """Devuelve el ID de la categoría y todos sus descendientes recursivamente."""
    all_ids = [category_id]
    
    def recurse(parent_id: int):
        children = db.exec(
            select(Category.id).where(Category.parent_id == parent_id)
        ).all()
        for child_id in children:
            all_ids.append(child_id)
            recurse(child_id)
    
    recurse(category_id)
    return all_ids

def update_category_metadata_recursive(db: Session, category: Category):
    """
    Recalcula slug, path y level de la categoría y todos sus descendientes.
    """
    parent = None
    if category.parent_id:
        parent = db.get(Category, category.parent_id)
    
    # Nuevo slug basado en nombre
    category.slug = slugify(category.name)
    
    # Nuevo level
    category.level = (parent.level + 1) if parent else 1
    
    # Nuevo path (ej: /root/child)
    category.path = (f"{parent.path}/{category.slug}") if parent else f"/{category.slug}"
    
    db.add(category)
    db.flush()
    
    # Recursión para hijos
    for child in category.subcategories:
        update_category_metadata_recursive(db, child)

# --- ENDPOINTS DE ATRIBUTOS ---

@router.get("/attributes")
def list_attributes(db: Session = Depends(get_session)):
    return db.exec(select(Characteristic)).all()

@router.post("/attributes")
def create_attribute(data: Dict[str, Any], db: Session = Depends(get_session)):
    norm_name = normalize_char(data.get("name", ""))
    norm_domain = []
    for item in data.get("domain", []):
        new_item = {**item}
        if "value" in new_item: new_item["value"] = normalize_opt(new_item["value"])
        norm_domain.append(new_item)

    attr = Characteristic(
        name=norm_name,
        description=data.get("description"),
        is_filterable=data.get("is_filterable", True),
        value_structure=data.get("value_structure", []),
        domain=norm_domain
    )
    db.add(attr)
    db.commit()
    db.refresh(attr)
    return attr

@router.put("/attributes/{attr_id}")
def update_attribute(attr_id: int, attr_data: Dict[str, Any], db: Session = Depends(get_session)):
    db_attr = db.get(Characteristic, attr_id)
    if not db_attr:
        raise HTTPException(status_code=404, detail="Característica no encontrada")
    
    # Normalizar nombre si viene
    if "name" in attr_data:
        attr_data["name"] = normalize_char(attr_data["name"])
    
    # Normalizar dominio si viene
    if "domain" in attr_data:
        norm_domain = []
        for item in attr_data["domain"]:
            new_item = {**item}
            if "value" in new_item: new_item["value"] = normalize_opt(new_item["value"])
            norm_domain.append(new_item)
        attr_data["domain"] = norm_domain

    for key, value in attr_data.items():
        if hasattr(db_attr, key):
            setattr(db_attr, key, value)
            
    db.add(db_attr)
    db.commit()
    db.refresh(db_attr)
    return db_attr

@router.delete("/attributes/{attr_id}")
def delete_attribute(attr_id: int, db: Session = Depends(get_session)):
    db_attr = db.get(Characteristic, attr_id)
    if not db_attr:
        raise HTTPException(status_code=404, detail="Característica no encontrada")
    
    db.delete(db_attr)
    db.commit()
    return {"ok": True}

@router.get("/attributes/{attr_id}")
def get_attribute(attr_id: int, db: Session = Depends(get_session)):
    attr = db.get(Characteristic, attr_id)
    if not attr:
        raise HTTPException(status_code=404, detail="Característica no encontrada")
    return {
        "id": attr.id,
        "name": attr.name,
        "description": attr.description,
        "is_filterable": attr.is_filterable,
        "value_structure": attr.value_structure,
        "domain": attr.domain
    }

@router.delete("/skus/{sku_id}")
def delete_sku(sku_id: int, db: Session = Depends(get_session)):
    sku = db.get(SKU, sku_id)
    if not sku:
        raise HTTPException(status_code=404, detail="Versión no encontrada")
    
    # 1. Limpiar movimientos de stock relacionados (Forma correcta SQLModel)
    db.exec(delete(StockMovement).where(StockMovement.sku_id == sku_id))
    
    # 2. Borrar SKU
    db.delete(sku)
    db.commit()
    return {"ok": True, "msg": "Versión eliminada permanentemente"}

@router.get("/skus/{sku_id}")
def get_sku(sku_id: int, db: Session = Depends(get_session)):
    sku = db.get(SKU, sku_id)
    if not sku:
        raise HTTPException(status_code=404, detail="Versión no encontrada")
    
    # Calcular stock actual
    stock_total = db.exec(
        select(func.sum(StockMovement.quantity))
        .where(StockMovement.sku_id == sku_id)
    ).one() or 0
    
    return {
        "id": sku.id,
        "sku": sku.sku,
        "product_id": sku.product_id,
        "product_name": sku.product.name if sku.product else "Producto Desconocido",
        "price": sku.price,
        "config": sku.config,
        "stock": stock_total,
        "image_urls": sku.image_urls
    }

# --- ENDPOINTS DE ESPECIFICACIONES ---

@router.get("/specifications")
def list_specifications(db: Session = Depends(get_session)):
    specs = db.exec(select(Specification)).all()
    results = []
    for s in specs:
        # Obtener nombres y valores permitidos para cada característica
        chars_snapshot = []
        links = db.exec(select(SpecificationCharacteristicLink).where(SpecificationCharacteristicLink.specification_id == s.id)).all()
        for link in links:
            char_obj = db.get(Characteristic, link.characteristic_id)
            if (char_obj):
                chars_snapshot.append({
                    "id": char_obj.id,
                    "name": char_obj.name,
                    "domain": char_obj.domain,
                    "allowed_values": link.allowed_values
                })

        results.append({
            "id": s.id,
            "name": s.name,
            "description": s.description,
            "characteristics": chars_snapshot, # Lista rica para evitar pérdida de datos/dominio
            "characteristic_names": [c["name"] for c in chars_snapshot],
            "characteristic_ids": [c["id"] for c in chars_snapshot],
            "category_ids": [cat.id for cat in s.categories]
        })
    return results

@router.post("/specifications")
def create_specification(data: SpecificationCreate, db: Session = Depends(get_session)):
    new_spec = Specification(name=data.name, description=data.description)
    db.add(new_spec)
    db.flush()
    
    # Vincular características con valores permitidos
    chars_to_link = data.characteristics if data.characteristics else [{"id": cid, "allowed_values": []} for cid in data.characteristic_ids]

    for char_info in chars_to_link:
        char_id = char_info["id"]
        # Normalizar valores permitidos
        allowed = [normalize_opt(v) for v in char_info.get("allowed_values", [])]
        link = SpecificationCharacteristicLink(
            specification_id=new_spec.id, 
            characteristic_id=char_id,
            allowed_values=allowed
        )
        db.add(link)
        
    # Vincular categorías
    for cat_id in data.category_ids:
        link = CategorySpecificationLink(category_id=cat_id, specification_id=new_spec.id)
        db.add(link)
    
    db.commit()
    db.refresh(new_spec)
    return new_spec

@router.put("/specifications/{spec_id}")
def update_specification(spec_id: int, data: SpecificationCreate, db: Session = Depends(get_session)):
    spec = db.get(Specification, spec_id)
    if not spec:
        raise HTTPException(status_code=404, detail="Especificación no encontrada")
    
    spec.name = data.name
    spec.description = data.description
    
    # Sincronizar características (borrar y recrear)
    old_char_links = db.exec(select(SpecificationCharacteristicLink).where(SpecificationCharacteristicLink.specification_id == spec_id)).all()
    for link in old_char_links:
        db.delete(link)
    
    chars_to_link = data.characteristics if data.characteristics else [{"id": cid, "allowed_values": []} for cid in data.characteristic_ids]

    for char_info in chars_to_link:
        char_id = char_info["id"]
        allowed = char_info.get("allowed_values", [])
        link = SpecificationCharacteristicLink(
            specification_id=spec_id, 
            characteristic_id=char_id,
            allowed_values=allowed
        )
        db.add(link)
        
    # Sincronizar categorías (borrar y recrear)
    old_cat_links = db.exec(select(CategorySpecificationLink).where(CategorySpecificationLink.specification_id == spec_id)).all()
    for link in old_cat_links:
        db.delete(link)
        
    for cat_id in data.category_ids:
        link = CategorySpecificationLink(category_id=cat_id, specification_id=spec_id)
        db.add(link)
    
    db.add(spec)
    db.commit()
    return {"ok": True}

@router.delete("/specifications/{spec_id}")
def delete_specification(spec_id: int, db: Session = Depends(get_session)):
    spec = db.get(Specification, spec_id)
    if not spec:
        raise HTTPException(status_code=404, detail="Especificación no encontrada")
    db.delete(spec)
    db.commit()
    return {"ok": True}

@router.get("/specifications/{spec_id}")
def get_specification(spec_id: int, db: Session = Depends(get_session)):
    s = db.get(Specification, spec_id)
    if not s:
        raise HTTPException(status_code=404, detail="Especificación no encontrada")
    
    # Obtener detalles vinculados (allowed_values)
    chars_snapshot = []
    links = db.exec(select(SpecificationCharacteristicLink).where(SpecificationCharacteristicLink.specification_id == s.id)).all()
    for link in links:
        char_obj = db.get(Characteristic, link.characteristic_id)
        if char_obj:
            chars_snapshot.append({
                "id": char_obj.id,
                "name": char_obj.name,
                "domain": char_obj.domain,
                "allowed_values": link.allowed_values
            })

    return {
        "id": s.id,
        "name": s.name,
        "description": s.description,
        "characteristics": chars_snapshot, # Lista rica
        "categories": [{
            "id": cat.id,
            "name": cat.name,
            "slug": cat.slug
        } for cat in s.categories]
    }

@router.get("/categories/{category_id}/specifications")
def get_category_specifications(category_id: int, db: Session = Depends(get_session)):
    """Devuelve las especificaciones sugeridas para una categoría."""
    category = db.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    
    results = []
    for s in category.suggested_specifications:
        results.append({
            "id": s.id,
            "name": s.name,
            "characteristics": [{
                "id": c.id,
                "name": c.name,
                "domain": c.domain
            } for c in s.characteristics]
        })
    return results

@router.get("/categories/{category_id}/attributes")
def get_category_attributes(category_id: int, db: Session = Depends(get_session)):
    """
    Devuelve las características vinculadas a una categoría y a todos sus ancestros.
    Esto permite que una subcategoría herede las características de sus padres.
    """
    category = db.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    
    all_characteristics = {}
    
    curr = category
    while curr:
        for char in curr.template_characteristics:
            if char.id not in all_characteristics:
                all_characteristics[char.id] = char
        if not curr.parent_id:
            break
        curr = db.get(Category, curr.parent_id)
        
    return list(all_characteristics.values())

# --- ENDPOINTS DE CATEGORIAS ---

@router.get("/categories")
def list_categories(
    db: Session = Depends(get_session),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500), # Límite aumentado para filtros
    search: Optional[str] = Query(None),
    parent_id: Optional[int] = Query(None)
):
    statement = select(Category)
    
    if search:
        statement = statement.where(Category.name.ilike(f"%{search}%"))
        
    if parent_id is not None:
        statement = statement.where(Category.parent_id == parent_id)
    
    # Ordenamiento PRO: Ruta jerárquica
    statement = statement.order_by(Category.path.asc())

    # Contar total para paginación
    total = db.exec(select(func.count()).select_from(statement.subquery())).one()
    
    # Aplicar paginación
    offset = (page - 1) * page_size
    categories = db.exec(statement.offset(offset).limit(page_size)).all()
    
    results = []
    for c in categories:
        product_count = len(c.products)
        results.append({
            "id": c.id,
            "name": c.name,
            "slug": c.slug,
            "parent_id": c.parent_id,
            "parent_name": c.parent.name if c.parent else None,
            "product_count": product_count,
            "is_joker": c.slug == "sin_categoria",
            "is_filterable": c.is_filterable,
            "level": c.level,
            "suggested_specification_ids": [s.id for s in c.suggested_specifications]
        })
    
    return {
        "items": results,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, -(-total // page_size))
    }

@router.get("/categories/{category_id}")
def get_category(category_id: int, db: Session = Depends(get_session)):
    category = db.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    
    return {
        "id": category.id,
        "name": category.name,
        "slug": category.slug,
        "parent_id": category.parent_id,
        "parent_name": category.parent.name if category.parent else None,
        "suggested_specifications": [{
            "id": s.id,
            "name": s.name
        } for s in category.suggested_specifications],
        "suggested_specification_ids": [s.id for s in category.suggested_specifications],
        "subcategories": [{
            "id": sub.id,
            "name": sub.name,
            "slug": sub.slug
        } for sub in category.subcategories],
        "is_filterable": category.is_filterable,
        "product_count": len(category.products)
    }

@router.post("/categories")
def create_category(category_data: CategoryUpdate, db: Session = Depends(get_session)):
    new_cat = Category(
        name=category_data.name,
        slug="temp-slug-" + str(func.random()),
        parent_id=category_data.parent_id,
        is_filterable=category_data.is_filterable if category_data.is_filterable is not None else True
    )
    db.add(new_cat)
    db.flush() 
    
    # Vincular especificaciones
    for spec_id in category_data.suggested_specification_ids:
        link = CategorySpecificationLink(category_id=new_cat.id, specification_id=spec_id)
        db.add(link)
    
    # Calculamos metadatos jerárquicos reales
    update_category_metadata_recursive(db, new_cat)
    
    db.commit()
    db.refresh(new_cat)
    return new_cat

@router.put("/categories/{category_id}")
def update_category(category_id: int, data: CategoryUpdate, db: Session = Depends(get_session)):
    category = db.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    
    if category.slug == "sin_categoria":
        raise HTTPException(status_code=403, detail="No se puede editar la categoría de seguridad del sistema")

    needs_slug_update = False
    
    if data.name and data.name != category.name: 
        category.name = data.name
        needs_slug_update = True
        
    if data.is_filterable is not None:
        category.is_filterable = data.is_filterable

    if data.parent_id is not None:
        if data.parent_id == category_id:
            raise HTTPException(status_code=400, detail="Una categoría no puede ser su propio padre")
        
        if data.parent_id != category.parent_id:
            category.parent_id = data.parent_id
            needs_slug_update = True
            
    # Sincronizar especificaciones sugeridas
    # Borrar vinculaciones previas
    old_links = db.exec(select(CategorySpecificationLink).where(CategorySpecificationLink.category_id == category_id)).all()
    for link in old_links:
        db.delete(link)
        
    # Crear nuevas vinculaciones
    for spec_id in data.suggested_specification_ids:
        link = CategorySpecificationLink(category_id=category_id, specification_id=spec_id)
        db.add(link)
            
    if needs_slug_update:
        update_category_metadata_recursive(db, category)
        
    db.add(category)
    db.commit()
    db.refresh(category)
    return category

@router.delete("/categories/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_session)):
    category = db.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    
    if category.slug == "sin-categoria":
        raise HTTPException(status_code=403, detail="No se puede eliminar la categoría de seguridad")

    joker = db.exec(select(Category).where(Category.slug == "sin-categoria")).first()
    
    for p in category.products:
        p.category_id = joker.id
        db.add(p)
    
    for sub in category.subcategories:
        sub.parent_id = None
        db.add(sub)
        
    db.delete(category)
    db.commit()
    return {"msg": "Categoría eliminada, productos movidos a 'Sin Categoría'"}

# --- ENDPOINTS DE PRODUCTOS (con paginación del servidor) ---

@router.get("/products")
def list_products_admin(
    db: Session = Depends(get_session),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None)
):
    statement = select(Product).where(Product.is_deleted == False)
    
    if search:
        statement = statement.where(Product.name.ilike(f"%{search}%"))
    
    if category_id:
        descendant_ids = get_descendant_ids(db, category_id)
        statement = statement.where(Product.category_id.in_(descendant_ids))
    
    total = db.exec(select(func.count()).select_from(statement.subquery())).one()
    
    offset = (page - 1) * page_size
    products = db.exec(statement.offset(offset).limit(page_size)).all()
    
    results = []
    for p in products:
        sku_ids = [s.id for s in p.skus]
        stock_total = 0
        if sku_ids:
            stock_total = db.exec(
                select(func.sum(StockMovement.quantity))
                .where(StockMovement.sku_id.in_(sku_ids))
            ).one() or 0
            
        results.append({
            "id": p.id,
            "name": p.name,
            "slug": p.slug,
            "category": p.category.name if p.category else "Sin Categoría",
            "category_id": p.category_id,
            "stock_total": stock_total
        })
        
    return {
        "items": results,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, -(-total // page_size))
    }

@router.get("/skus")
def list_skus_admin(
    request: Request,
    db: Session = Depends(get_session),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    stock_status: Optional[str] = Query(None),
    stock_threshold: int = Query(5)
):
    # Join con Product para filtrar y obtener nombres
    statement = select(SKU, Product.name, Product.category_id).join(Product, SKU.product_id == Product.id)
    statement = statement.where(Product.is_deleted == False)
    
    # 1. Búsqueda por texto (SKU o Nombre)
    if search:
        statement = statement.where(
            or_(
                SKU.sku.ilike(f"%{search}%"),
                Product.name.ilike(f"%{search}%")
            )
        )
    
    # 2. Filtro por Categoría
    if category_id:
        descendant_ids = get_descendant_ids(db, category_id)
        statement = statement.where(Product.category_id.in_(descendant_ids))

    # 3. Filtros Dinámicos por Atributos (attr_*)
    try:
        for key, value in request.query_params.items():
            if key.startswith("attr_") and value:
                attr_name = key.replace("attr_", "")
                # Usando cast explícito a JSONB para asegurar disponibilidad de operadores de Postgres
                # El operador ->> en Postgres devuelve Texto, por lo que comparamos directamente con el string
                statement = statement.where(cast(SKU.config, JSONB)[attr_name].astext == value)
    except Exception as e:
        print(f"Error en filtros dinámicos: {e}")
        # No bloqueamos la ejecución, pero logueamos

    # 4. Filtro de Stock (Requiere subconsulta para la suma de movimientos)
    if stock_status:
        # Subconsulta para obtener el stock actual de cada SKU
        stock_subquery = (
            select(StockMovement.sku_id, func.sum(StockMovement.quantity).label("total_stock"))
            .group_by(StockMovement.sku_id)
            .subquery()
        )
        
        statement = statement.outerjoin(stock_subquery, SKU.id == stock_subquery.c.sku_id)
        
        if stock_status == "agotado":
            statement = statement.where(or_(stock_subquery.c.total_stock == 0, stock_subquery.c.total_stock == None))
        elif stock_status == "bajo_stock":
            statement = statement.where(and_(stock_subquery.c.total_stock > 0, stock_subquery.c.total_stock <= stock_threshold))
        elif stock_status == "disponible":
            statement = statement.where(stock_subquery.c.total_stock > stock_threshold)
    
    # Ordenar por SKU por defecto
    statement = statement.order_by(SKU.sku.asc())

    # Contar total
    total = db.exec(select(func.count()).select_from(statement.subquery())).one()
    
    # Paginación
    offset = (page - 1) * page_size
    skus_data = db.exec(statement.offset(offset).limit(page_size)).all()
    
    results = []
    for sku_obj, product_name, p_cat_id in skus_data:
        # Calcular stock total para este SKU
        stock_total = db.exec(
            select(func.sum(StockMovement.quantity))
            .where(StockMovement.sku_id == sku_obj.id)
        ).one() or 0
            
        results.append({
            "id": sku_obj.id,
            "sku": sku_obj.sku,
            "product_id": sku_obj.product_id,
            "product_name": product_name,
            "price": sku_obj.price,
            "config": sku_obj.config,
            "stock": stock_total,
            "image_url": sku_obj.image_urls[0] if sku_obj.image_urls else None
        })
        
    return {
        "items": results,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, -(-total // page_size))
    }

@router.post("/generate-variants")
def generate_variants(data: VariantGenRequest, db: Session = Depends(get_session)):
    category = db.get(Category, data.category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
        
    combinations = inventory_core.generate_variant_matrix(data.attributes)
    results = []
    
    for combo in combinations:
        # Normalizar combo: LLAVES en mayúsculas, VALORES en Title Case
        norm_combo = {normalize_char(k): normalize_opt(v) for k, v in combo.items()}
        
        sku_code = inventory_core.generate_sku_id(category.name, data.product_name, norm_combo)
        results.append({
            "sku": sku_code,
            "config": norm_combo,
            "price": 0,
            "stock": 0
        })
    return results

import traceback
from datetime import datetime

@router.post("/products")
def create_product(data: ProductCreate, db: Session = Depends(get_session)):
    try:
        # Enforce slug convention: pr-name_format
        final_slug = data.slug
        if not final_slug.startswith("pr-"):
            final_slug = f"pr-{final_slug}"
        
        product = Product(
            name=data.name,
            slug=final_slug,
            description=data.description,
            category_id=data.category_id,
            extras=data.extras,
            specs=data.specs
        )
        db.add(product)
        db.commit()
        db.refresh(product)

        for s_data in data.skus:
            barcode_val = s_data.barcode
            if not barcode_val:
                barcode_val = s_data.sku
                inventory_core.create_barcode_image(barcode_val, s_data.sku)

            # Normalizar config del SKU
            norm_config = {normalize_char(k): normalize_opt(v) for k, v in s_data.config.items()}

            sku = SKU(
                product_id=product.id,
                sku=s_data.sku,
                barcode=barcode_val,
                price=s_data.price,
                config=norm_config
            )
            db.add(sku)
            db.flush() 

            # Crear movimiento inicial de stock (RECEIPT)
            if s_data.stock > 0:
                movement = StockMovement(
                    sku_id=sku.id,
                    type=MovementType.RECEIPT,
                    quantity=s_data.stock,
                    note="Carga inicial de producto"
                )
                db.add(movement)

        for i_data in data.images:
            img = ProductImage(
                product_id=product.id,
                url=i_data.url,
                is_main=i_data.is_main,
                ui_config=i_data.ui_config
            )
            db.add(img)

        db.commit()
        return {"msg": "Producto creado con éxito", "id": product.id}
    except Exception as e:
        error_msg = traceback.format_exc()
        with open("debug_error.log", "a") as f:
            f.write(f"\n--- ERROR PRODUCT CREATE ({datetime.now()}) ---\n")
            f.write(error_msg)
            f.write("\n--------------------------------------------\n")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")

@router.get("/products/{product_id}")
def get_product(product_id: int, db: Session = Depends(get_session)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    return {
        "id": product.id,
        "name": product.name,
        "slug": product.slug,
        "description": product.description,
        "category_id": product.category_id,
        "category_name": product.category.name if product.category else "Sin categoría",
        "extras": product.extras,
        "specs": product.specs,
        "skus": [{
            "id": s.id,
            "sku": s.sku,
            "price": s.price,
            "stock": db.exec(
                select(func.sum(StockMovement.quantity))
                .where(StockMovement.sku_id == s.id)
            ).one() or 0,
            "config": s.config,
            "image_urls": s.image_urls
        } for s in product.skus],
        "images": [{
            "url": img.url,
            "is_main": img.is_main
        } for img in product.images]
    }

@router.put("/products/{product_id}")
def update_product(product_id: int, data: ProductCreate, db: Session = Depends(get_session)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    # Update basic info
    product.name = data.name
    product.slug = data.slug
    product.description = data.description
    product.category_id = data.category_id
    product.extras = data.extras
    product.specs = data.specs
    
    db.add(product)
    
    # --- ESTRATEGIA DE OPTIMIZACIÓN MASIVA (STOCK) ---
    # Obtenemos el stock actual de TODOS los SKUs existentes del producto en una sola consulta
    existing_sku_ids = [s.id for s in product.skus]
    stock_map = {}
    if existing_sku_ids:
        # Consulta bulk agrupada por sku_id
        stock_results = db.exec(
            select(StockMovement.sku_id, func.sum(StockMovement.quantity))
            .where(StockMovement.sku_id.in_(existing_sku_ids))
            .group_by(StockMovement.sku_id)
        ).all()
        stock_map = {sid: total for sid, total in stock_results}
    
    # Update SKUs
    existing_skus_by_code = {s.sku: s for s in product.skus}
    operation_errors = []
    success_count = 0
    
    for s_data in data.skus:
        try:
            # Usar un "savepoint" (Nested Transaction) para aislar cada operación de SKU
            with db.begin_nested():
                # Normalizar la configuración antes de procesar
                norm_config = {normalize_char(k): normalize_opt(v) for k, v in s_data.config.items()}
                
                sku = None
                if s_data.sku in existing_skus_by_code:
                    # Actualizar existente
                    sku = existing_skus_by_code[s_data.sku]
                    sku.price = s_data.price
                    sku.barcode = s_data.barcode or s_data.sku
                    sku.config = norm_config
                    sku.image_urls = s_data.image_urls
                    db.add(sku)
                else:
                    # Crear nuevo
                    sku = SKU(
                        product_id=product.id,
                        sku=s_data.sku,
                        barcode=s_data.barcode or s_data.sku,
                        price=s_data.price,
                        config=norm_config,
                        image_urls=s_data.image_urls
                    )
                    db.add(sku)
                    db.flush() # Disparar el check de unicidad preventivamente
                
                # Conciliación de stock (Optimizado usando el mapa local)
                # Nota: sku.id ahora es seguro de usar gracias al flush()
                current_stock = stock_map.get(sku.id, 0)
                
                if s_data.stock != current_stock:
                    adjustment = s_data.stock - current_stock
                    move = StockMovement(
                        sku_id=sku.id,
                        type=MovementType.ADJUSTMENT,
                        quantity=adjustment,
                        note="Ajuste manual desde edición masiva de producto"
                    )
                    db.add(move)
                
                # Si llegamos aquí sin excepción, la sub-transacción es exitosa
                success_count += 1

        except IntegrityError as e:
            # Si hay una violación de unicidad (o cualquier error de integridad),
            # el savepoint hace rollback de esta versión SOLAMENTE.
            error_detail = str(e.orig)
            msg = "El código SKU ya existe en otro producto"
            # Si el detalle contiene información de que es el mismo producto, afinamos el mensaje
            if str(product.id) in error_detail:
                msg = "Este código SKU está duplicado dentro de tu misma lista de versiones"
            
            operation_errors.append({
                "sku": s_data.sku,
                "error": msg,
                "detail": error_detail
            })
            continue
        except Exception as e:
            operation_errors.append({
                "sku": s_data.sku,
                "error": f"Error inesperado: {str(e)}"
            })
            continue

    # Eliminar SKUs que ya no vienen en el nuevo set (si aplica)
    incoming_sku_names = {s_data.sku for s_data in data.skus}
    for sku_name, sku_obj in existing_skus_by_code.items():
        if sku_name not in incoming_sku_names:
            # En Desarrollo o si se requiere limpieza, borramos movimientos antes
            # Borrado robusto de movimientos para evitar bloqueo de integridad
            db.exec(
                delete(StockMovement).where(StockMovement.sku_id == sku_obj.id)
            )
            db.delete(sku_obj)
        
    # Update Images (Delete and recreate)
    for img in product.images:
        db.delete(img)
        
    for i_data in data.images:
        new_img = ProductImage(
            product_id=product.id,
            url=i_data.url,
            is_main=i_data.is_main,
            ui_config=i_data.ui_config,
            config_match=i_data.config_match
        )
        db.add(new_img)
    
    db.commit()
    
    response_data = {
        "msg": "Proceso completado" if not operation_errors else "Proceso completado con algunas omisiones",
        "success_count": success_count,
        "error_count": len(operation_errors),
        "errors": operation_errors
    }
    
    # Si hubo errores pero también éxitos, podemos considerar un 200 con reporte 
    # o un 207 Multi-Status. Por simplicidad en frontend, usaremos 200 con el flag 'errors'.
    return response_data

@router.delete("/products/{product_id}")
def delete_product(product_id: int, force: bool = False, db: Session = Depends(get_session)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    # Decisión Arquitectónica: Hard vs Soft Delete
    perform_hard_delete = settings.is_dev or force

    if perform_hard_delete:
        # HARD DELETE: Limpieza profunda física
        from sqlmodel import delete
        
        # 1. Borrar fotos
        for img in product.images:
            db.delete(img)
        
        # 2. Borrar SKUs y sus movimientos
        for sku in product.skus:
            # Borrar movimientos del SKU (Forma correcta en SQLModel)
            db.exec(delete(StockMovement).where(StockMovement.sku_id == sku.id))
            db.delete(sku)
        
        # 3. Borrar producto base
        db.delete(product)
        db.commit()
        return {"msg": "Producto y todos sus datos relacionados eliminados permanentemente (Hard Delete)"}
    else:
        # SOFT DELETE: Marcado lógico (Producción)
        product.is_deleted = True
        db.add(product)
        db.commit()
        return {"msg": "Producto desactivado correctamente (Soft Delete)"}

# --- ENDPOINTS DE COLORES (Color Swatch Registry) ---

@router.post("/colors/sync")
def sync_colors_to_attribute(db: Session = Depends(get_session)):
    """
    Sincroniza la tabla ColorSwatch con la característica maestra 'Color'.
    Asegura que el 'domain' de la característica 'Color' refleje los swatches oficiales.
    """
    # 1. Obtener todos los swatches oficiales
    swatches = db.exec(select(ColorSwatch)).all()
    domain_list = [{"value": s.name, "hex_code": s.hex_code} for s in swatches]
    
    # 2. Buscar la característica 'Color' (por nombre, insensible a mayúsculas)
    chars = db.exec(select(Characteristic)).all()
    color_attr = next((c for c in chars if c.name.lower() in ['color', 'colores']), None)
    
    if not color_attr:
        # Si no existe, la creamos
        color_attr = Characteristic(
            name="Color",
            description="Característica maestra del sistema para gestión cromática.",
            is_filterable=True,
            value_structure="color",
            domain=domain_list
        )
        db.add(color_attr)
    else:
        # Si existe, actualizamos su dominio
        color_attr.domain = domain_list
        db.add(color_attr)
    
    db.commit()
    return {"status": "success", "synced_count": len(domain_list)}

@router.get("/colors")
def list_colors(db: Session = Depends(get_session)):
    return db.exec(select(ColorSwatch)).all()

@router.post("/colors")
def create_color(data: ColorSwatchCreate, db: Session = Depends(get_session)):
    # Generamos un slug para el color
    new_slug = slugify(data.name)
    
    # Verificamos si ya existe
    existing = db.exec(select(ColorSwatch).where(ColorSwatch.slug == new_slug)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un color con ese nombre o similar.")
        
    color = ColorSwatch(
        name=data.name,
        hex_code=data.hex_code,
        slug=new_slug
    )
    db.add(color)
    db.commit()
    db.refresh(color)
    return color

@router.put("/colors/{color_id}")
def update_color(color_id: int, data: ColorSwatchCreate, db: Session = Depends(get_session)):
    color = db.get(ColorSwatch, color_id)
    if not color:
        raise HTTPException(status_code=404, detail="Color no encontrado")
    
    color.name = data.name
    color.hex_code = data.hex_code
    color.slug = slugify(data.name)
    
    db.add(color)
    db.commit()
    db.refresh(color)
    return color

@router.delete("/colors/{color_id}")
def delete_color(color_id: int, db: Session = Depends(get_session)):
    color = db.get(ColorSwatch, color_id)
    if not color:
        raise HTTPException(status_code=404, detail="Color no encontrado")
    db.delete(color)
    db.commit()
    return {"ok": True}
