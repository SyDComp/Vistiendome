from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from ...database import get_session
from ...models.catalog import Product, Category, SKU, ProductImage, StockMovement, Characteristic, Specification
from pydantic import BaseModel

router = APIRouter()

class VariantSummary(BaseModel):
    sku: str
    config: Dict[str, str]
    image: Optional[str] = None
    price: float

class ProductListSchema(BaseModel):
    id: int
    name: str
    slug: str
    category: str
    category_id: int
    category_slug: str
    image: Optional[str] = None
    sku: Optional[str] = None
    price: float
    variants: List[VariantSummary] = []
    specs: Dict[str, str] = {}

@router.get("/", response_model=List[ProductListSchema])
def list_products(
    db: Session = Depends(get_session),
    category: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    specs: Optional[str] = Query(None) # JSON-like string or comma separated: "Color:Rojo,Material:Lana"
):
    query = select(Product).where(Product.is_deleted == False)
    if category:
        query = query.join(Category).where(Category.slug == category)
    
    products = db.exec(query).all()
    
    results = []
    for p in products:
        # Encontrar precio mínimo entre sus SKUs
        prices = [sku.price for sku in p.skus]
        min_p = min(prices) if prices else 0
        
        # Filtro de precio (aplicado en Python por simplicidad dado que el precio está en SKUs)
        if min_price is not None and min_p < min_price: continue
        if max_price is not None and min_p > max_price: continue

        # Filtro de especificaciones/características
        if specs:
            parts = specs.split(',')
            match = True
            for part in parts:
                if ':' not in part: continue
                key, val = part.split(':', 1)
                # Buscar en specs del producto o en config de sus SKUs
                in_specs = p.specs.get(key) == val
                in_config = any(s.config.get(key) == val for s in p.skus)
                if not (in_specs or in_config):
                    match = False
                    break
            if not match: continue

        # Recolectar variantes para el buscador (Deep Search)
        variant_summaries = []
        for s in p.skus:
            # Encontrar la primera imagen de este SKU o la principal del producto como fallback
            v_img = s.image_urls[0] if s.image_urls else None
            variant_summaries.append(VariantSummary(
                sku=s.sku,
                config=s.config,
                image=v_img,
                price=s.price
            ))

        # Encontrar imagen principal del producto
        main_img = next((img.url for img in p.images if img.is_main), None)
        if not main_img and p.images:
            main_img = p.images[0].url
            
        # Encontrar el SKU que "posee" esta imagen principal para Deep Linking
        main_sku_code = None
        if main_img:
            # Buscamos el primer SKU que use esta imagen
            for s in p.skus:
                if any(img_url == main_img for img_url in s.image_urls):
                    main_sku_code = s.sku
                    break
            
        results.append(ProductListSchema(
            id=p.id,
            name=p.name,
            slug=p.slug,
            category=p.category.name,
            category_id=p.category_id,
            category_slug=p.category.slug,
            image=main_img,
            sku=main_sku_code,
            price=min_p,
            variants=variant_summaries,
            specs=p.specs
        ))
    return results

@router.get("/categories/tree")
def get_categories_tree(db: Session = Depends(get_session)):
    """
    Devuelve un bosque (lista de árboles) con todas las categorías de forma jerárquica.
    Optimizado para filtros colapsables en el frontend. Solo devuelve las marcadas como is_filterable.
    """
    # Traer todas las categorías ordenadas por nivel para construir el árbol
    all_categories = db.exec(
        select(Category)
        .where(Category.is_filterable == True)
        .order_by(Category.level.asc())
    ).all()
    
    # Mapeo por ID para construcción eficiente
    nodes = {}
    for c in all_categories:
        nodes[c.id] = {
            "id": c.id,
            "name": c.name,
            "slug": c.slug,
            "level": c.level,
            "children": []
        }
    
    forest = []
    for c in all_categories:
        if c.parent_id and c.parent_id in nodes:
            nodes[c.parent_id]["children"].append(nodes[c.id])
        else:
            forest.append(nodes[c.id])
            
    return forest

@router.get("/filters-metadata")
def get_filters_metadata(db: Session = Depends(get_session)):
    """
    Extrae dinámicamente los metadatos para construir el Drawer de filtros.
    Incluye categorías, características marcadas como filterable y rangos de precio.
    """
    # 1. Categorías Filterable
    categories = db.exec(select(Category).where(Category.is_filterable == True)).all()
    
    # 2. Atributos Filterable y sus valores únicos REALES en stock
    filterable_chars = db.exec(select(Characteristic).where(Characteristic.is_filterable == True)).all()
    
    attributes_data = {}
    for char in filterable_chars:
        # Buscar valores únicos en Product.specs o SKU.config
        # Por eficiencia, usaremos los 'domain' definidos si existen, 
        # o escanearemos valores si el usuario prefiere algo más dinámico.
        # De momento, usamos el domain si tiene, si no, intentamos deducir.
        values = [opt['value'] for opt in char.domain] if char.domain else []
        
        # Opcionalmente: escanear productos para ver qué valores hay realmente
        # (Esto es más pesado pero más preciso)
        if not values:
            # Ejemplo simplificado de escaneo
            all_products = db.exec(select(Product)).all()
            found_values = set()
            for p in all_products:
                if char.name in p.specs:
                    found_values.add(p.specs[char.name])
                for s in p.skus:
                    if char.name in s.config:
                        found_values.add(s.config[char.name])
            values = list(found_values)

        if values:
            attributes_data[char.name] = sorted(values)

    # 3. Rango de Precios
    prices = db.exec(select(SKU.price)).all()
    price_range = {
        "min": min(prices) if prices else 0,
        "max": max(prices) if prices else 0
    }

    return {
        "categories": [{"id": c.id, "name": c.name, "slug": c.slug} for c in categories],
        "attributes": attributes_data,
        "price_range": price_range
    }

@router.get("/{id_or_slug}")
def get_product_detail(
    id_or_slug: str,
    db: Session = Depends(get_session)
):
    # Intentar buscar por ID primero, luego por SLUG
    try:
        product_id = int(id_or_slug)
        statement = select(Product).where(Product.id == product_id)
    except ValueError:
        statement = select(Product).where(Product.slug == id_or_slug)
        
    product = db.exec(statement).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    skus_data = []
    for s in product.skus:
        stock = db.exec(
            select(func.sum(StockMovement.quantity))
            .where(StockMovement.sku_id == s.id)
        ).one() or 0
        skus_data.append({
            "id": s.id, 
            "sku": s.sku, 
            "config": s.config, 
            "price": s.price, 
            "stock": stock,
            "image_urls": s.image_urls
        })

    # Encontrar imagen principal (portada)
    main_img = next((img.url for img in product.images if img.is_main), None)
    if not main_img and product.images:
        main_img = product.images[0].url

    # Estructura optimizada para DetalleProducto.jsx
    return {
        "id": product.id,
        "name": product.name,
        "slug": product.slug,
        "description": product.description,
        "specs": product.specs,
        "category": {"name": product.category.name, "slug": product.category.slug},
        "image": main_img,
        "images": [{"url": i.url, "config_match": i.config_match, "is_main": i.is_main, "ui_config": i.ui_config} for i in product.images],
        "skus": skus_data
    }
