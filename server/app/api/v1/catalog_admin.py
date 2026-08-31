from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Response, UploadFile, File, Request
from sqlmodel import Session, select, func, delete, or_, and_, cast, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from ...database import get_session
from ...models.catalog import (
    Product, Category, SKU, MediaAsset, ProductMediaLink, SKUMediaLink,
    Characteristic, Specification, SpecificationCharacteristicLink, CategorySpecificationLink,
    StockMovement, MovementType, ColorSwatch
)
import string
from ...core.imagenes import srcset_de

def normalize_char(text: str) -> str:
    """Normaliza características a MAYÚSCULAS"""
    if not text: return ""
    return text.strip().upper()

def normalize_opt(text: str) -> str:
    """Normaliza opciones a Mayúscula Cada Palabra preservando siglas comunes en mayúscula"""
    if not text: return ""
    cleaned = text.strip()
    upper_cleaned = cleaned.upper()
    if upper_cleaned in {"XS", "S", "M", "L", "XL", "XXL", "XXXL", "CM", "MM", "KG", "ML", "UN", "PAR"}:
        return upper_cleaned
    return string.capwords(cleaned.lower())

from ...core import inventory_core
from pydantic import BaseModel
import re
import unicodedata
from ...core.config import settings
from ...core.sockets import manager
from ...api.deps import RequirePermiso

router = APIRouter(dependencies=[Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))])

# --- SCHEMAS DE ENTRADA ---

class SKUCreate(BaseModel):
    sku: str
    barcode: Optional[str] = None
    price: float
    stock: int
    config: Dict[str, str]
    media_ids: List[int] = []
    # Oferta a nivel variante (sobrescribe la del producto). type: 'percent'|'fixed'
    sale_type: Optional[str] = None
    sale_value: Optional[float] = None
    sale_start: Optional[datetime] = None
    sale_end: Optional[datetime] = None

class ImageCreate(BaseModel):
    media_asset_id: int
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
    # Oferta a nivel producto (aplica a todas las variantes). type: 'percent'|'fixed'
    sale_type: Optional[str] = None
    sale_value: Optional[float] = None
    sale_start: Optional[datetime] = None
    sale_end: Optional[datetime] = None

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
    attrs = db.exec(select(Characteristic)).all()
    if not any(a.name == "ESTAMPADO" for a in attrs) or not any(a.name == "COLOR" for a in attrs) or not any(a.name == "TALLA" for a in attrs):
        seed_system_attributes(db)
        attrs = db.exec(select(Characteristic)).all()
    return attrs

@router.post("/attributes")
async def create_attribute(data: Dict[str, Any], db: Session = Depends(get_session)):
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
        afecta_apariencia=data.get("afecta_apariencia", False),
        en_orden_corte=data.get("en_orden_corte", True),
        value_structure=data.get("value_structure", []),
        domain=norm_domain,
        is_system=data.get("is_system", False)
    )
    db.add(attr)
    db.commit()
    db.refresh(attr)

    # Notificar cambio en tiempo real
    await manager.broadcast({"type": "invalidate_cache", "resource": "attributes", "action": "create"})

    return attr

@router.put("/attributes/{attr_id}")
async def update_attribute(attr_id: int, attr_data: Dict[str, Any], db: Session = Depends(get_session)):
    db_attr = db.get(Characteristic, attr_id)
    if not db_attr:
        raise HTTPException(status_code=404, detail="Característica no encontrada")
    
    # 1. BLOQUEO: No se puede cambiar el nombre a una característica de sistema
    if db_attr.is_system and "name" in attr_data:
        norm_new_name = normalize_char(attr_data["name"])
        if norm_new_name != db_attr.name:
            raise HTTPException(status_code=403, detail="No se puede cambiar el nombre a una característica protegida por el sistema")
    
    # 2. BLOQUEO: No se puede eliminar una característica de sistema
    # (Ya se maneja en el endpoint DELETE, pero aquí protegemos el flag is_system si se intentara falsear)
    if db_attr.is_system and attr_data.get("is_system") is False:
         raise HTTPException(status_code=403, detail="No se puede degradar una característica de sistema a usuario")

    # 3. BLOQUEO: sólo Color y Estampado tienen fija su propiedad visual.
    # La clienta decide libremente qué características son visuales — incluidas
    # las del sistema como Talla, que puede marcar y desmarcar cuando quiera.
    # Las DOS únicas excepciones son Color y Estampado: el explorador se apoya
    # en que exista al menos una visual, y si no quedara ninguna dejaría de
    # poder separar tarjetas, colapsando cada producto a una sola.
    # Se identifican por system_id y no por "es del sistema": Talla también lo
    # es, y no debe quedar atrapada si alguna vez se la marca como visual.
    VISUALES_FIJAS = ("sys_color", "sys_pattern")
    if (db_attr.system_id in VISUALES_FIJAS
            and attr_data.get("afecta_apariencia") is False):
        raise HTTPException(
            status_code=403,
            detail=f"'{db_attr.name}' define cómo se ve la prenda y no puede dejar de hacerlo: el Explorador la necesita para separar las tarjetas"
        )

    # Normalizar nombre si viene (y no es sistema o es el mismo)
    if "name" in attr_data:
        attr_data["name"] = normalize_char(attr_data["name"])
    
    # Normalizar dominio si viene
    if "domain" in attr_data:
        new_domain = attr_data["domain"]
        old_domain = db_attr.domain or []
        
        # A. VALIDAR INMUTABILIDAD DE vOS (Opciones del Sistema)
        # Si la característica es de sistema, verificamos que no se hayan borrado o alterado las vOS existentes
        if db_attr.is_system:
            old_system_values = {opt["value"]: opt for opt in old_domain if opt.get("is_system")}
            new_values_map = {opt["value"]: opt for opt in new_domain}
            
            for val, old_opt in old_system_values.items():
                if val not in new_values_map:
                    raise HTTPException(status_code=403, detail=f"La opción de sistema '{val}' es inmutable y no puede ser eliminada")
                
                # Opcional: Impedir cambio de hex_code en vOS si quisiéramos ser ultra-estrictos
                # if old_opt.get("hex_code") != new_values_map[val].get("hex_code"):
                #    raise HTTPException(status_code=403, detail=f"No se permite alterar el color base de la opción de sistema '{val}'")

        # B. CHECK DE USO (Para vOS y vOU)
        # Si se está intentando eliminar una opción (que no esté en el nuevo dominio), comprobamos si hay SKUs usándola
        old_values = {opt["value"] for opt in old_domain}
        new_values = {normalize_opt(opt.get("value", "")) for opt in new_domain}
        removed_values = old_values - new_values
        
        if removed_values:
            # Buscamos en SKUs si alguna configuración usa estos valores para ESTE atributo
            # Nota: SKU.config es JSONB, buscamos la clave del atributo
            for val in removed_values:
                # Consulta para ver si existe algún SKU con este valor en la clave db_attr.name
                statement = select(func.count(SKU.id)).where(SKU.config[db_attr.name].as_string() == val)
                count = db.exec(statement).one()
                if count > 0:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"No se puede eliminar '{val}': está vinculada a {count} variante(s). Desvincúlala primero."
                    )

        norm_domain = []
        for item in new_domain:
            new_item = {**item}
            if "value" in new_item: new_item["value"] = normalize_opt(new_item["value"])
            # Asegurar que mantenemos el flag is_system si ya venía o si es nueva vOU
            norm_domain.append(new_item)
        attr_data["domain"] = norm_domain

    for key, value in attr_data.items():
        if hasattr(db_attr, key):
            setattr(db_attr, key, value)
            
    db.add(db_attr)
    db.commit()
    db.refresh(db_attr)

    # Notificar cambio en tiempo real
    await manager.broadcast({
        "type": "invalidate_cache",
        "resource": "attributes",
        "action": "update",
        "id": attr_id
    })
    
    return db_attr

# --- BODEGA (KARDEX) ---
# La pantalla de Bodega pedía estos tres endpoints y NINGUNO existía: la
# vista quedaba muerta con "Error al cargar saldos". El libro de movimientos
# (StockMovement) ya era la autoridad del stock en todo el sistema; sólo
# faltaba exponerlo.
#
# El front usa los tipos en minúscula ('receipt', 'sale', 'adjustment') y el
# modelo los guarda en mayúscula, así que se traducen en el borde.

_TIPOS_MOVIMIENTO = {
    "receipt": MovementType.RECEIPT,
    "sale": MovementType.SALE,
    "adjustment": MovementType.ADJUSTMENT,
    "return": MovementType.RETURN,
    "reservation": MovementType.RESERVATION,
}


class MovimientoKardex(BaseModel):
    sku_id: int
    type: str
    quantity: int
    note: Optional[str] = None


@router.get("/kardex")
def kardex_saldos(db: Session = Depends(get_session)):
    """Saldo actual de cada variante, sumando su libro de movimientos."""
    saldos = dict(
        db.exec(
            select(StockMovement.sku_id, func.sum(StockMovement.quantity))
            .group_by(StockMovement.sku_id)
        ).all()
    )
    filas = []
    for sku, product_name in db.exec(
        select(SKU, Product.name).join(Product, SKU.product_id == Product.id)
    ).all():
        filas.append({
            "sku_id": sku.id,
            "sku": sku.sku,
            "product_name": product_name,
            "config": sku.config or {},
            "current_stock": saldos.get(sku.id, 0) or 0,
        })
    return filas


@router.get("/kardex/{sku_id}/history")
def kardex_historial(sku_id: int, db: Session = Depends(get_session)):
    """Movimientos de una variante, del más reciente al más antiguo."""
    sku = db.get(SKU, sku_id)
    if not sku:
        raise HTTPException(status_code=404, detail="Variante no encontrada")

    movimientos = db.exec(
        select(StockMovement)
        .where(StockMovement.sku_id == sku_id)
        .order_by(StockMovement.created_at.desc(), StockMovement.id.desc())
    ).all()

    return {
        "sku_id": sku.id,
        "sku": sku.sku,
        "product_name": sku.product.name if sku.product else "",
        "config": sku.config or {},
        "current_stock": sum(m.quantity for m in movimientos),
        "history": [
            {
                "id": m.id,
                # En minúscula: es lo que la pantalla compara para elegir icono
                # y etiqueta. Si llegara en mayúscula, todo saldría como "Ajuste".
                "type": m.type.value.lower() if hasattr(m.type, "value") else str(m.type).lower(),
                "quantity": m.quantity,
                "note": m.note,
                "reference_id": m.reference_id,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in movimientos
        ],
    }


@router.post("/kardex/movement")
async def kardex_registrar_movimiento(data: MovimientoKardex, db: Session = Depends(get_session)):
    """
    Registra un movimiento manual (ingreso o ajuste).

    La cantidad llega ya firmada desde la pantalla: positiva para ingreso,
    negativa para merma. No se corrige acá para no contradecir lo que el
    usuario vio al confirmar.
    """
    if not db.get(SKU, data.sku_id):
        raise HTTPException(status_code=404, detail="Variante no encontrada")

    tipo = _TIPOS_MOVIMIENTO.get((data.type or "").lower())
    if tipo is None:
        raise HTTPException(status_code=400, detail=f"Tipo de movimiento no válido: '{data.type}'")

    if data.quantity == 0:
        raise HTTPException(status_code=400, detail="La cantidad no puede ser cero")

    movimiento = StockMovement(
        sku_id=data.sku_id,
        type=tipo,
        quantity=data.quantity,
        note=data.note,
    )
    db.add(movimiento)
    db.commit()
    db.refresh(movimiento)

    await manager.broadcast({"type": "invalidate_cache", "resource": "products"})

    total = db.exec(
        select(func.sum(StockMovement.quantity)).where(StockMovement.sku_id == data.sku_id)
    ).one() or 0
    return {"ok": True, "id": movimiento.id, "current_stock": total}


@router.delete("/attributes/{attr_id}")
async def delete_attribute(attr_id: int, db: Session = Depends(get_session)):
    db_attr = db.get(Characteristic, attr_id)
    if not db_attr:
        raise HTTPException(status_code=404, detail="Característica no encontrada")
    
    if db_attr.is_system:
        raise HTTPException(status_code=403, detail="No se puede eliminar una característica maestra del sistema")
    
    # Check si tiene productos asociados antes de borrar
    # (Opcional: aquí podríamos ser más estrictos si quisiéramos)
    
    db.delete(db_attr)
    db.commit()

    # Notificar cambio en tiempo real
    await manager.broadcast({
        "type": "invalidate_cache",
        "resource": "attributes",
        "action": "delete",
        "id": attr_id
    })

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
        "afecta_apariencia": attr.afecta_apariencia,
        "en_orden_corte": attr.en_orden_corte,
        "is_system": attr.is_system,
        "system_id": attr.system_id,
        "value_structure": attr.value_structure,
        "domain": attr.domain
    }

@router.delete("/skus/{sku_id}")
async def delete_sku(sku_id: int, db: Session = Depends(get_session)):
    sku = db.get(SKU, sku_id)
    if not sku:
        raise HTTPException(status_code=404, detail="Versión no encontrada")
    
    # 1. Limpiar movimientos de stock relacionados (Forma correcta SQLModel)
    db.exec(delete(StockMovement).where(StockMovement.sku_id == sku_id))
    
    # 2. Borrar SKU
    db.delete(sku)
    db.commit()

    # Notificar cambio en tiempo real
    await manager.broadcast({
        "type": "invalidate_cache",
        "resource": "products",
        "action": "update_sku",
        "sku": sku.sku
    })

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
        "sale_type": sku.sale_type,
        "sale_value": sku.sale_value,
        "sale_start": sku.sale_start.isoformat() if sku.sale_start else None,
        "sale_end": sku.sale_end.isoformat() if sku.sale_end else None,
        "config": sku.config,
        "stock": stock_total,
        "image_urls": [m.url for m in sku.media_assets],
        "media_ids": [m.id for m in sku.media_assets],
        "media_assets": [{"id": m.id, "url": m.url} for m in sku.media_assets]
    }


class SKUUpdate(BaseModel):
    price: Optional[float] = None
    sale_type: Optional[str] = None      # 'percent' | 'fixed' | None (sin oferta)
    sale_value: Optional[float] = None
    sale_start: Optional[datetime] = None
    sale_end: Optional[datetime] = None


@router.put("/skus/{sku_id}")
async def update_sku(sku_id: int, data: SKUUpdate, db: Session = Depends(get_session)):
    """Actualiza precio y oferta de una variante individual."""
    sku = db.get(SKU, sku_id)
    if not sku:
        raise HTTPException(status_code=404, detail="Versión no encontrada")

    if data.price is not None:
        sku.price = data.price
    # La oferta se reemplaza por completo con lo que envíe el cliente
    # (sale_type None => se limpia la oferta de la variante).
    sku.sale_type = data.sale_type
    sku.sale_value = data.sale_value
    sku.sale_start = data.sale_start
    sku.sale_end = data.sale_end

    db.add(sku)
    db.commit()
    db.refresh(sku)

    await manager.broadcast({
        "type": "invalidate_cache",
        "resource": "products",
        "action": "update_sku",
        "sku": sku.sku
    })

    return {
        "id": sku.id,
        "sku": sku.sku,
        "price": sku.price,
        "sale_type": sku.sale_type,
        "sale_value": sku.sale_value,
        "sale_start": sku.sale_start.isoformat() if sku.sale_start else None,
        "sale_end": sku.sale_end.isoformat() if sku.sale_end else None,
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
async def create_category(category_data: CategoryUpdate, db: Session = Depends(get_session)):
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

    # Notificar cambio en tiempo real
    await manager.broadcast({
        "type": "invalidate_cache",
        "resource": "categories",
        "action": "create",
        "slug": new_cat.slug
    })

    return new_cat

@router.put("/categories/{category_id}")
async def update_category(category_id: int, data: CategoryUpdate, db: Session = Depends(get_session)):
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

    # Notificar cambio en tiempo real
    await manager.broadcast({
        "type": "invalidate_cache",
        "resource": "categories",
        "action": "update",
        "slug": category.slug
    })

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
    page: int = 1,
    page_size: int = 999999,
    search: Optional[str] = None,
    category_id: Optional[int] = None
):
    """Lista productos sin límites de paginación."""
    statement = select(Product).where(Product.is_deleted == False).options(selectinload(Product.skus))
    
    if search:
        statement = statement.where(Product.name.ilike(f"%{search}%"))
    
    if category_id:
        descendant_ids = get_descendant_ids(db, category_id)
        statement = statement.where(Product.category_id.in_(descendant_ids))
    
    total = db.exec(select(func.count()).select_from(statement.subquery())).one()
    
    offset = (page - 1) * page_size
    # 1. Obtener productos de la página actual
    products = db.exec(statement.offset(offset).limit(page_size)).all()
    product_ids = [p.id for p in products]
    
    # 2. Carga masiva de stock y precios (Optimizado para evitar N+1 queries)
    sku_to_product = {}
    all_sku_ids = []
    for p in products:
        for s in p.skus:
            sku_to_product[s.id] = p.id
            all_sku_ids.append(s.id)
            
    stock_map = {}
    price_ranges = {} # {product_id: [min, max]}
    
    # Pre-cargar precios desde los objetos SKU ya cargados por la relación
    for p in products:
        prices = [s.price for s in p.skus if s.price is not None]
        if prices:
            price_ranges[p.id] = [min(prices), max(prices)]
        else:
            price_ranges[p.id] = [0, 0]

    if all_sku_ids:
        stock_results = db.exec(
            select(StockMovement.sku_id, func.sum(StockMovement.quantity))
            .where(StockMovement.sku_id.in_(all_sku_ids))
            .group_by(StockMovement.sku_id)
        ).all()
        for sid, qty in stock_results:
            pid = sku_to_product[sid]
            stock_map[pid] = stock_map.get(pid, 0) + (qty or 0)

    # 3. Carga masiva de imágenes (Optimizado: 1 query para todas las imágenes principales/fallbacks)
    image_map = {}
    srcset_map = {}
    if product_ids:
        # Obtenemos todos los links y URLs para estos productos
        all_links = db.exec(
            select(ProductMediaLink.product_id, ProductMediaLink.is_main, MediaAsset)
            .join(MediaAsset, ProductMediaLink.media_asset_id == MediaAsset.id)
            .where(ProductMediaLink.product_id.in_(product_ids))
        ).all()

        # Procesamos para elegir la mejor imagen (is_main primero, luego cualquiera)
        for pid, is_main, asset in all_links:
            if pid not in image_map or is_main:
                image_map[pid] = asset.url
                # Derivadas para las miniaturas del panel: sin esto, una grilla
                # de tarjetas de 120 px baja los originales de ~500 KB cada uno.
                srcset_map[pid] = srcset_de(asset)

    # 4. Construir resultados
    results = []
    for p in products:
        results.append({
            "id": p.id,
            "name": p.name,
            "slug": p.slug,
            "image": image_map.get(p.id),
            "image_srcset": srcset_map.get(p.id, ""),
            "category": p.category.name if p.category else "Sin Categoría",
            "category_id": p.category_id,
            "price_min": price_ranges.get(p.id, [0,0])[0],
            "price_max": price_ranges.get(p.id, [0,0])[1],
            "stock_total": stock_map.get(p.id, 0)
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
    page: int = 1,
    page_size: int = 999999,
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    product_id: Optional[int] = None,
    stock_status: Optional[str] = None,
    stock_threshold: int = 5
):
    """Lista SKUs sin límites de paginación."""
    # Join con Product para filtrar y obtener nombres
    statement = select(SKU, Product.name, Product.category_id).join(Product, SKU.product_id == Product.id).options(selectinload(SKU.media_assets))
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

    # 2b. Filtro por Producto (CRÍTICO PARA WORKSPACE)
    if product_id:
        statement = statement.where(SKU.product_id == product_id)

    # 3. Filtros Dinámicos por Atributos (attr_*) (Insensible a mayúsculas/minúsculas en clave y valor)
    try:
        for key, value in request.query_params.items():
            if key.startswith("attr_") and value:
                attr_name = key.replace("attr_", "")
                key_variants = {
                    attr_name,
                    attr_name.upper(),
                    attr_name.lower(),
                    string.capwords(attr_name.lower())
                }
                val_lower = value.strip().lower()
                conditions = [
                    func.lower(cast(SKU.config, JSONB)[k].astext) == val_lower
                    for k in key_variants
                ]
                statement = statement.where(or_(*conditions))
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
            # `<= 0`, no `== 0`. Un saldo negativo es posible y real: una prenda
            # hecha a pedido nunca estuvo en bodega, asi que al despacharla el
            # saldo queda en negativo — es la deuda, y es informacion buena.
            # Con `== 0` no caia en "agotado", ni en "bajo stock" (pide > 0), ni
            # en "disponible": desaparecia de los tres filtros, justo en la
            # pantalla que existe para decir que falta.
            statement = statement.where(or_(stock_subquery.c.total_stock <= 0, stock_subquery.c.total_stock == None))
        elif stock_status == "bajo_stock":
            statement = statement.where(and_(stock_subquery.c.total_stock > 0, stock_subquery.c.total_stock <= stock_threshold))
        elif stock_status == "disponible":
            statement = statement.where(stock_subquery.c.total_stock > stock_threshold)
    
    # Ordenar por SKU por defecto
    statement = statement.order_by(SKU.sku.asc())

    # Contar total
    total = db.exec(select(func.count()).select_from(statement.subquery())).one()
    
    # Paginación INTELIGENTE: Si hay product_id (Workspace), traemos TODO sin límites.
    if product_id:
        # Aseguramos que no exista ningún límite residual en el statement
        full_statement = statement.limit(None).offset(None)
        skus_data = db.exec(full_statement).all()
        print(f"\n--- DEBUG WORKSPACE ---")
        print(f"Producto: {product_id}")
        print(f"SKUs recuperados: {len(skus_data)}")
        print(f"-----------------------\n")
    else:
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
            "barcode": sku_obj.barcode,
            "product_id": sku_obj.product_id,
            "product_name": product_name,
            "price": sku_obj.price,
            "config": sku_obj.config,
            "stock": stock_total,
            "media_assets": [{"id": m.id, "url": m.url} for m in sku_obj.media_assets],
            "media_ids": [m.id for m in sku_obj.media_assets],
            "image_url": sku_obj.media_assets[0].url if sku_obj.media_assets else None
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
        barcode_val = inventory_core.generate_barcode_eAN13(sku_code)
        results.append({
            "sku": sku_code,
            "barcode": barcode_val,
            "config": norm_combo,
            "price": 0,
            "stock": 0
        })
    return results

import traceback
from datetime import datetime

@router.post("/products")
async def create_product(data: ProductCreate, db: Session = Depends(get_session)):
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
            specs=data.specs,
            sale_type=data.sale_type,
            sale_value=data.sale_value,
            sale_start=data.sale_start,
            sale_end=data.sale_end
        )
        db.add(product)
        db.commit()
        db.refresh(product)

        for s_data in data.skus:
            barcode_val = s_data.barcode
            if not barcode_val:
                barcode_val = inventory_core.generate_barcode_eAN13(s_data.sku)
                # Ya no creamos la imagen física aquí, el frontend lo renderiza


            # Normalizar config del SKU
            norm_config = {normalize_char(k): normalize_opt(v) for k, v in s_data.config.items()}

            sku = SKU(
                product_id=product.id,
                sku=s_data.sku,
                barcode=barcode_val,
                price=s_data.price,
                config=norm_config,
                sale_type=s_data.sale_type,
                sale_value=s_data.sale_value,
                sale_start=s_data.sale_start,
                sale_end=s_data.sale_end
            )
            db.add(sku)
            db.flush()

            # Asignación relacional a SKUMediaLink
            for media_id in s_data.media_ids:
                db.add(SKUMediaLink(sku_id=sku.id, media_asset_id=media_id))

            # Crear movimiento inicial de stock (RECEIPT)
            if s_data.stock > 0:
                movement = StockMovement(
                    sku_id=sku.id,
                    type=MovementType.RECEIPT,
                    quantity=s_data.stock,
                    note="Carga inicial de producto"
                )
                db.add(movement)

        # Garantizar que al menos una imagen sea principal si hay imágenes
        if data.images and not any(i.is_main for i in data.images):
            data.images[0].is_main = True

        for i_data in data.images:
            link = ProductMediaLink(
                product_id=product.id,
                media_asset_id=i_data.media_asset_id,
                is_main=i_data.is_main,
                ui_config=i_data.ui_config
            )
            db.add(link)

        db.commit()

        # Notificar cambio en tiempo real
        await manager.broadcast({
            "type": "invalidate_cache",
            "resource": "products",
            "action": "create",
            "product_id": product.id
        })

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
    
    # Calcular agregados
    prices = [s.price for s in product.skus if s.price is not None]
    price_min = min(prices) if prices else 0
    price_max = max(prices) if prices else 0

    sku_ids = [s.id for s in product.skus]
    stock_total = 0
    if sku_ids:
        stock_total = db.exec(
            select(func.sum(StockMovement.quantity))
            .where(StockMovement.sku_id.in_(sku_ids))
        ).one() or 0

    return {
        "id": product.id,
        "name": product.name,
        "slug": product.slug,
        "description": product.description,
        "category_id": product.category_id,
        "category_name": product.category.name if product.category else "Sin categoría",
        "extras": product.extras,
        "specs": product.specs,
        "sale_type": product.sale_type,
        "sale_value": product.sale_value,
        "sale_start": product.sale_start.isoformat() if product.sale_start else None,
        "sale_end": product.sale_end.isoformat() if product.sale_end else None,
        "price_min": price_min,
        "price_max": price_max,
        "stock_total": stock_total,
        "skus": [{
            "id": s.id,
            "sku": s.sku,
            "barcode": s.barcode,
            "price": s.price,
            "sale_type": s.sale_type,
            "sale_value": s.sale_value,
            "sale_start": s.sale_start.isoformat() if s.sale_start else None,
            "sale_end": s.sale_end.isoformat() if s.sale_end else None,
            "stock": db.exec(
                select(func.sum(StockMovement.quantity))
                .where(StockMovement.sku_id == s.id)
            ).one() or 0,
            "config": s.config,
            "media_ids": [m.id for m in s.media_assets],
            "media_assets": [{"id": m.id, "url": m.url} for m in s.media_assets]
        } for s in product.skus],
        "images": [{
            "media_asset_id": link.media_asset_id,
            "url": db.get(MediaAsset, link.media_asset_id).url if db.get(MediaAsset, link.media_asset_id) else "",
            "is_main": link.is_main,
            "ui_config": link.ui_config
        } for link in db.exec(select(ProductMediaLink).where(ProductMediaLink.product_id == product.id)).all()]
    }

@router.put("/products/{product_id}")
async def update_product(product_id: int, data: ProductCreate, db: Session = Depends(get_session)):
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
    product.sale_type = data.sale_type
    product.sale_value = data.sale_value
    product.sale_start = data.sale_start
    product.sale_end = data.sale_end

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
                    sku.barcode = s_data.barcode or (sku.barcode if sku.barcode else inventory_core.generate_barcode_eAN13(sku.sku))
                    sku.config = norm_config
                    sku.sale_type = s_data.sale_type
                    sku.sale_value = s_data.sale_value
                    sku.sale_start = s_data.sale_start
                    sku.sale_end = s_data.sale_end
                    db.add(sku)
                    
                    db.exec(delete(SKUMediaLink).where(SKUMediaLink.sku_id == sku.id))
                    for media_id in s_data.media_ids:
                        db.add(SKUMediaLink(sku_id=sku.id, media_asset_id=media_id))
                else:
                    # Crear nuevo
                    sku = SKU(
                        product_id=product.id,
                        sku=s_data.sku,
                        barcode=s_data.barcode or inventory_core.generate_barcode_eAN13(s_data.sku),
                        price=s_data.price,
                        config=norm_config,
                        sale_type=s_data.sale_type,
                        sale_value=s_data.sale_value,
                        sale_start=s_data.sale_start,
                        sale_end=s_data.sale_end
                    )
                    db.add(sku)
                    db.flush() # Disparar el check de unicidad preventivamente
                    
                    for media_id in s_data.media_ids:
                        db.add(SKUMediaLink(sku_id=sku.id, media_asset_id=media_id))
                
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
    db.exec(delete(ProductMediaLink).where(ProductMediaLink.product_id == product.id))
        
    # Garantizar que al menos una imagen sea principal si hay imágenes
    if data.images and not any(i.is_main for i in data.images):
        data.images[0].is_main = True
        
    for i_data in data.images:
        new_link = ProductMediaLink(
            product_id=product.id,
            media_asset_id=i_data.media_asset_id,
            is_main=i_data.is_main,
            ui_config=i_data.ui_config
        )
        db.add(new_link)
    
    db.commit()

    # Notificar cambio en tiempo real
    await manager.broadcast({
        "type": "invalidate_cache",
        "resource": "products",
        "action": "update",
        "product_id": product_id
    })
    
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
async def delete_product(product_id: int, force: bool = False, db: Session = Depends(get_session)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    # Decisión Arquitectónica: Hard vs Soft Delete
    perform_hard_delete = settings.is_dev or force

    if perform_hard_delete:
        # HARD DELETE: Limpieza profunda física
        from sqlmodel import delete
        
        # 1. Borrar enlaces de fotos del producto (los MediaAssets se conservan en la galería)
        db.exec(delete(ProductMediaLink).where(ProductMediaLink.product_id == product.id))
        
        # 2. Borrar SKUs, sus movimientos y sus enlaces de medios
        for sku in product.skus:
            db.exec(delete(StockMovement).where(StockMovement.sku_id == sku.id))
            db.exec(delete(SKUMediaLink).where(SKUMediaLink.sku_id == sku.id))
            db.delete(sku)
        
        # 3. Borrar producto base
        db.delete(product)
        db.commit()

        # Notificar cambio en tiempo real
        await manager.broadcast({
            "type": "invalidate_cache",
            "resource": "products",
            "action": "delete",
            "product_id": product_id
        })

        return {"msg": "Producto y todos sus datos relacionados eliminados permanentemente (Hard Delete)"}
    else:
        # SOFT DELETE: Marcado lógico (Producción)
        product.is_deleted = True
        db.add(product)
        db.commit()
        return {"msg": "Producto desactivado correctamente (Soft Delete)"}

@router.post("/attributes/seed-system")
def seed_system_attributes(db: Session = Depends(get_session)):
    """
    Inicializa o actualiza las características maestras del sistema (COLOR, TALLA)
    con sus kits de opciones base (vOS) inmutables.
    """
    # 1. DEFINICIÓN DEL KIT DE COLORES (20 vOS)
    system_colors = [
        {"value": "Negro", "hex_code": "#1F1E1E", "order": 1, "is_system": True},
        {"value": "Blanco", "hex_code": "#FFFFFF", "order": 2, "is_system": True},
        {"value": "Beige", "hex_code": "#D1C9C1", "order": 3, "is_system": True},
        {"value": "Azul Marino", "hex_code": "#231D54", "order": 4, "is_system": True},
        {"value": "Sandia", "hex_code": "#D1511A", "order": 5, "is_system": True},
        {"value": "Mostaza", "hex_code": "#D5B46C", "order": 6, "is_system": True},
        {"value": "Uva", "hex_code": "#A809B3", "order": 7, "is_system": True},
        {"value": "Lila", "hex_code": "#A997F2", "order": 8, "is_system": True},
        {"value": "Verde Brasil", "hex_code": "#1DAF92", "order": 9, "is_system": True},
        {"value": "Coral", "hex_code": "#EBA2AD", "order": 10, "is_system": True},
        {"value": "Turquesa", "hex_code": "#73D1E8", "order": 11, "is_system": True},
        {"value": "Azul Rey", "hex_code": "#3D5EE1", "order": 12, "is_system": True},
        {"value": "Palo Rosa", "hex_code": "#E9BED1", "order": 13, "is_system": True},
        {"value": "Rojo Italiano", "hex_code": "#B90909", "order": 14, "is_system": True},
        {"value": "Verde Agua", "hex_code": "#73D7D9", "order": 15, "is_system": True},
        {"value": "Gris", "hex_code": "#AABADA", "order": 16, "is_system": True},
        {"value": "Burdeo", "hex_code": "#AA1354", "order": 17, "is_system": True},
        {"value": "Chocolate", "hex_code": "#682222", "order": 18, "is_system": True},
        {"value": "Menta", "hex_code": "#A2F1E8", "order": 19, "is_system": True},
        {"value": "Morado", "hex_code": "#730891", "order": 20, "is_system": True},
    ]

    # 2. DEFINICIÓN DEL KIT DE TALLAS (13 vOS con orden específico)
    # Orden: 12 (1) -> 14 (2) -> XS (3) -> S (4) ... -> 7XL (13)
    system_sizes = [
        {"value": "12", "order": 1, "is_system": True},
        {"value": "14", "order": 2, "is_system": True},
        {"value": "XS", "order": 3, "is_system": True},
        {"value": "S", "order": 4, "is_system": True},
        {"value": "M", "order": 5, "is_system": True},
        {"value": "L", "order": 6, "is_system": True},
        {"value": "XL", "order": 7, "is_system": True},
        {"value": "2XL", "order": 8, "is_system": True},
        {"value": "3XL", "order": 9, "is_system": True},
        {"value": "4XL", "order": 10, "is_system": True},
        {"value": "5XL", "order": 11, "is_system": True},
        {"value": "6XL", "order": 12, "is_system": True},
        {"value": "7XL", "order": 13, "is_system": True},
    ]

    # 3. DEFINICIÓN DEL KIT DE ESTAMPADOS/DISEÑOS (Patrones con imagen)
    system_patterns = [
        {"value": "Floral Primavera", "image_url": "", "order": 1, "is_system": False},
        {"value": "Rayas Marineras", "image_url": "", "order": 2, "is_system": False},
        {"value": "Animal Print", "image_url": "", "order": 3, "is_system": False},
    ]

    results = []
    
    for attr_name, attr_domain, system_id in [
        ("COLOR", system_colors, "sys_color"),
        ("TALLA", system_sizes, "sys_size"),
        ("ESTAMPADO", system_patterns, "sys_pattern")
    ]:
        if system_id == "sys_color":
            v_struct = [
                {"label": "Nombre del Color", "key": "value", "type": "text"},
                {"label": "Código Hex", "key": "hex_code", "type": "color"}
            ]
        elif system_id == "sys_pattern":
            v_struct = [
                {"label": "Nombre del Estampado / Diseño", "key": "value", "type": "text"},
                {"label": "URL de Imagen", "key": "image_url", "type": "image"}
            ]
        else:
            v_struct = [{"label": "Valor", "key": "value", "type": "text"}]

        # Buscar característica existente
        attr = db.exec(select(Characteristic).where(Characteristic.name == attr_name)).first()
        
        if not attr:
            attr = Characteristic(
                name=attr_name,
                description=f"Característica maestra de {attr_name} (Sistema Vistiendomé)",
                is_system=True,
                system_id=system_id,
                # Color y Estampado cambian cómo se ve la prenda; Talla no.
                # No es "del sistema => visual": las tres son del sistema y sólo
                # dos lo son. Sigue siendo editable desde el panel.
                afecta_apariencia=system_id in ("sys_color", "sys_pattern"),
                value_structure=v_struct,
                domain=attr_domain
            )
            db.add(attr)
        else:
            attr.value_structure = v_struct
            # Actualizar/Fusionar dominios
            # Mantener las vOU (User Options) que el usuario ya haya creado, 
            # pero eliminando duplicados si el sistema ahora provee una vOS con el mismo nombre.
            current_domain = attr.domain or []
            
            # Nueva lógica Ultra-Deduplicada:
            # 1. Crear un mapa de Valor Normalizado -> Objeto Opción para las vOS nuevas
            vos_map = {normalize_opt(opt["value"]): opt for opt in attr_domain}
            
            # 2. Filtrar las opciones actuales
            # Si una opción actual (sea vOS antigua o vOU) tiene el mismo nombre que una vOS nueva,
            # LA DESCARTAMOS (será reemplazada por la vOS fresca del mapa).
            # Solo conservamos vOU reales que NO colisionen por nombre.
            preserved_vou = []
            seen_values = set(vos_map.keys())
            
            for opt in current_domain:
                val = normalize_opt(opt.get("value", ""))
                if not val: continue
                
                # Solo conservamos si no es una vOS antigua (porque ya tenemos la fresca en vos_map)
                # y si no colisiona con una vOS nueva por nombre
                if val not in seen_values and not opt.get("is_system"):
                    preserved_vou.append(opt)
                    seen_values.add(val) # Evitar duplicados dentro de las propias vOU si existieran
            
            # 3. Resultado final: todas las vOS nuevas + las vOU preservadas
            attr.domain = list(vos_map.values()) + preserved_vou
            attr.is_system = True
            attr.system_id = system_id
            db.add(attr)
            
        results.append(attr_name)

    db.commit()
    return {"msg": "Kits base inyectados correctamente", "attributes": results}

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
            name="COLOR",
            description="Característica maestra del sistema para gestión cromática.",
            is_filterable=True,
            is_system=True,
            domain=domain_list
        )
        db.add(color_attr)
    else:
        # Si ya es de sistema, preferimos usar el nuevo endpoint de seed para una gestión más fina,
        # pero aquí actualizamos el dominio si se solicita.
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
