from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from datetime import datetime
from ...database import get_session
from ...models.catalog import Product, Category, SKU, StockMovement, Characteristic, Specification
from ...core.pricing import compute_effective_price, get_chile_time
from ...core.looks import colapsar_en_looks, imagen_de_variante
from pydantic import BaseModel

router = APIRouter()

class VariantSummary(BaseModel):
    id: Optional[int] = None
    sku: str
    config: Dict[str, str]
    image: Optional[str] = None
    price: float                       # precio efectivo (con oferta si aplica)
    original_price: float              # precio base sin oferta
    on_sale: bool = False

class ProductListSchema(BaseModel):
    id: int
    name: str
    slug: str
    category: str
    category_id: int
    category_slug: str
    image: Optional[str] = None
    sku: Optional[str] = None
    price: float                       # menor precio efectivo entre variantes
    original_price: float              # menor precio base entre variantes
    on_sale: bool = False              # True si alguna variante tiene oferta vigente
    variants: List[VariantSummary] = []
    specs: Dict[str, str] = {}
    extras: Dict[str, Any] = {}

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
    now = get_chile_time()

    results = []
    for p in products:
        # Precio efectivo (con oferta) y precio base por cada SKU
        eff = {sku.sku: compute_effective_price(sku, p, now) for sku in p.skus}
        prices = [e[0] for e in eff.values()]          # efectivos
        base_prices = [sku.price for sku in p.skus]    # sin oferta
        min_p = min(prices) if prices else 0
        min_base = min(base_prices) if base_prices else 0
        product_on_sale = any(e[1] for e in eff.values())

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
            v_img = s.media_assets[0].url if s.media_assets else None
            eff_price, on_sale, _ = eff[s.sku]
            variant_summaries.append(VariantSummary(
                id=s.id,
                sku=s.sku,
                config=s.config,
                image=v_img,
                price=eff_price,
                original_price=s.price,
                on_sale=on_sale
            ))

        # Encontrar imagen principal del producto
        main_img = None
        if p.media_assets:
            main_img = p.media_assets[0].url
        elif variant_summaries and variant_summaries[0].image:
            main_img = variant_summaries[0].image
            
        # Encontrar el SKU que "posee" esta imagen principal para Deep Linking
        main_sku_code = None
        if main_img:
            # Buscamos el primer SKU que use esta imagen
            for s in p.skus:
                if any(m.url == main_img for m in s.media_assets):
                    main_sku_code = s.sku
                    break
            
        # Construir mapa de MediaAsset ID -> SKU code para este producto
        media_id_to_sku = {}
        for s in p.skus:
            for m in s.media_assets:
                if m.id not in media_id_to_sku:
                    media_id_to_sku[m.id] = s.sku

        modified_extras = dict(p.extras) if p.extras else {}
        if "preview_carousel" in modified_extras:
            new_carousel = []
            for item in modified_extras["preview_carousel"]:
                media_id = item.get("id")
                # Crear un nuevo dict para evitar mutar el original en memoria compartida
                new_item = dict(item)
                if media_id in media_id_to_sku:
                    new_item["sku"] = media_id_to_sku[media_id]
                new_carousel.append(new_item)
            modified_extras["preview_carousel"] = new_carousel

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
            original_price=min_base,
            on_sale=product_on_sale,
            variants=variant_summaries,
            specs=p.specs,
            extras=modified_extras
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
        values = []
        ordered_from_domain = False
        if char.domain:
            ordered_from_domain = True
            # Respetar el orden configurado (campo 'order') del dominio
            domain_opts = sorted(
                char.domain,
                key=lambda o: (o.get('order', 9999) if isinstance(o, dict) else 9999)
            )
            for opt in domain_opts:
                if isinstance(opt, dict) and 'value' in opt:
                    values.append(opt['value'])
                elif isinstance(opt, str):
                    values.append(opt)

        # Opcionalmente: escanear productos para ver qué valores hay realmente
        # (Esto es más pesado pero más preciso)
        if not values:
            ordered_from_domain = False
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
            if ordered_from_domain:
                # Ya viene ordenado por el dominio (incluye tallas en su secuencia real)
                attributes_data[char.name] = values
            else:
                # Orden especial para tallas; alfabético para el resto
                is_size = 'TALLA' in char.name.upper() or 'SIZE' in char.name.upper()
                if is_size:
                    size_order = ['12', '14', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL', '7XL']
                    values = sorted(values, key=lambda v: (
                        size_order.index(v.strip().upper()) if v.strip().upper() in size_order else len(size_order),
                        v.upper()
                    ))
                else:
                    values = sorted(values)
                attributes_data[char.name] = values

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

class LookSchema(BaseModel):
    """Una tarjeta del catálogo/explorador. Reemplaza a mandar todas las variantes."""
    id: str
    product_id: int
    slug: str
    name: str
    category: str
    category_slug: str
    image: Optional[str] = None
    sku: Optional[str] = None
    config: Dict[str, str] = {}
    price: float
    original_price: float
    on_sale: bool = False


@router.get("/looks", response_model=List[LookSchema])
def list_looks(db: Session = Depends(get_session)):
    """
    Devuelve una tarjeta por look en vez de todas las variantes.

    El navegador venía descargando el producto cartesiano completo (1.049
    variantes, 278 KB) para dibujar ~60 tarjetas. El colapso se hace acá.

    Qué características separan un look lo declara la clienta en el panel
    (Characteristic.afecta_apariencia); acá no se adivina nada.
    """
    visuales = {
        c.name.strip().lower()
        for c in db.exec(select(Characteristic)).all()
        if c.afecta_apariencia
    }

    productos = db.exec(select(Product).where(Product.is_deleted == False)).all()
    now = get_chile_time()
    salida: List[LookSchema] = []

    for p in productos:
        skus = list(p.skus)
        precio_de = {s.id: compute_effective_price(s, p, now) for s in skus}
        imagen_de = {s.id: imagen_de_variante(s) for s in skus}

        # Precio del producto: el menor entre sus variantes. Sirve de respaldo
        # para la tarjeta que representa al producto entero (la que no apunta a
        # una variante concreta).
        efectivos = [precio_de[s.id][0] for s in skus] or [0]
        base_min = min([s.price for s in skus] or [0])

        por_sku = {s.sku: s for s in skus}
        portada = p.media_assets[0].url if p.media_assets else None

        for look in colapsar_en_looks(p, skus, imagen_de, visuales):
            s = por_sku.get(look["sku"])
            if s is not None:
                efectivo, en_oferta, _ = precio_de[s.id]
                precio, original = efectivo, s.price
            else:
                # Tarjeta del producto: precio "desde".
                precio, original, en_oferta = min(efectivos), base_min, False

            salida.append(LookSchema(
                id=look["id"],
                product_id=p.id,
                slug=p.slug,
                name=look["name"],
                category=p.category.name,
                category_slug=p.category.slug,
                image=look["image"] or portada,
                sku=look["sku"],
                config=look["config"],
                price=precio,
                original_price=original,
                on_sale=en_oferta,
            ))

    return salida


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
    
    now = get_chile_time()
    skus_data = []
    for s in product.skus:
        stock = db.exec(
            select(func.sum(StockMovement.quantity))
            .where(StockMovement.sku_id == s.id)
        ).one() or 0
        eff_price, on_sale, sale_ends = compute_effective_price(s, product, now)
        skus_data.append({
            "id": s.id,
            "sku": s.sku,
            "config": s.config,
            "price": eff_price,
            "original_price": s.price,
            "on_sale": on_sale,
            "sale_ends": sale_ends.isoformat() if sale_ends else None,
            "stock": stock,
            "image_urls": [m.url for m in s.media_assets]
        })

    # Encontrar imagen principal (portada)
    main_img = product.media_assets[0].url if product.media_assets else None
    if not main_img and product.skus:
        # Fallback a la primera imagen de variante disponible si el producto no tiene globales
        for s in product.skus:
            if s.media_assets:
                main_img = s.media_assets[0].url
                break

    # Estructura optimizada para DetalleProducto.jsx
    return {
        "id": product.id,
        "name": product.name,
        "slug": product.slug,
        "description": product.description,
        "specs": product.specs,
        "category": {"name": product.category.name, "slug": product.category.slug},
        "image": main_img,
        "images": [{"url": m.url, "config_match": {}, "is_main": (i==0), "ui_config": {}} for i, m in enumerate(product.media_assets)],
        "skus": skus_data
    }
