from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from datetime import datetime
from ...database import get_session
from ...models.catalog import Product, Category, SKU, StockMovement, Characteristic, Specification
from ...core.pricing import compute_effective_price, get_chile_time
from ...core.looks import colapsar_en_looks, imagen_de_variante, asset_de_variante
from ...core.imagenes import srcset_de
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
    image_srcset: str = ""
    sku: Optional[str] = None
    price: float                       # menor precio efectivo entre variantes
    original_price: float              # menor precio base entre variantes
    on_sale: bool = False              # True si alguna variante tiene oferta vigente
    variants: List[VariantSummary] = []
    specs: Dict[str, str] = {}
    extras: Dict[str, Any] = {}

def _extras_con_carrusel(producto, media_id_to_sku: Optional[Dict[int, str]] = None) -> Dict[str, Any]:
    """
    Copia los `extras` del producto agregándole a cada foto del carrusel su
    `srcset` (y su `sku`, si se pasa el mapa).

    Vive acá y no en cada endpoint porque el catálogo (`/looks`) y el listado
    completo (`/`) muestran el mismo carrusel: si sólo uno enriquece, esa
    página baja los originales completos sin que nada avise.
    """
    extras = dict(producto.extras) if producto.extras else {}
    if "preview_carousel" not in extras:
        return extras

    # Los assets del carrusel pueden colgar del producto o de sus variantes.
    assets_por_id = {}
    for s in producto.skus:
        for m in s.media_assets:
            assets_por_id.setdefault(m.id, m)
    for m in producto.media_assets:
        assets_por_id.setdefault(m.id, m)

    nuevo = []
    for item in extras["preview_carousel"]:
        media_id = item.get("id")
        # Copia: mutar el original tocaría el dict que vive en memoria compartida
        nuevo_item = dict(item)
        if media_id_to_sku and media_id in media_id_to_sku:
            nuevo_item["sku"] = media_id_to_sku[media_id]
        if media_id in assets_por_id:
            nuevo_item["srcset"] = srcset_de(assets_por_id[media_id])
        nuevo.append(nuevo_item)
    extras["preview_carousel"] = nuevo
    return extras


@router.get("/", response_model=List[ProductListSchema])
def list_products(db: Session = Depends(get_session)):
    """
    Listado completo con variantes. Lo consumen el buscador, el CMS, las
    colecciones y el modal del admin, que necesitan los valores de cada
    variante para buscar y filtrar en memoria.

    Ya no recibe filtros (category/min_price/max_price/specs): nadie los pasaba
    y el filtrado real ocurre en el cliente, en memoria, para que se sienta
    instantáneo. Mantener una segunda implementación en Python que nunca corría
    era una trampa — el próximo que arreglara un filtro podía hacerlo acá y no
    ver ningún efecto. El catálogo y el explorador usan /looks, no este endpoint.
    """
    products = db.exec(select(Product).where(Product.is_deleted == False)).all()
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
        main_srcset = ""
        if p.media_assets:
            main_img = p.media_assets[0].url
            main_srcset = srcset_de(p.media_assets[0])
        elif p.skus and p.skus[0].media_assets:
            asset = p.skus[0].media_assets[0]
            main_img = asset.url
            main_srcset = srcset_de(asset)
            
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

        modified_extras = _extras_con_carrusel(p, media_id_to_sku)

        results.append(ProductListSchema(
            id=p.id,
            name=p.name,
            slug=p.slug,
            category=p.category.name,
            category_id=p.category_id,
            category_slug=p.category.slug,
            image=main_img,
            image_srcset=main_srcset,
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
    # Versiones livianas de `image`, listas para el atributo srcset del <img>.
    # Vacio = esa foto no tiene derivadas y se usa `image` tal cual.
    image_srcset: str = ""
    sku: Optional[str] = None
    config: Dict[str, str] = {}
    # Valores disponibles dentro del look (todas las tallas de ese color, etc.).
    # El filtro los usa para no descartar un look por la variante que lo
    # representa, y el detalle para preseleccionar.
    facets: Dict[str, List[str]] = {}
    price: float
    original_price: float
    on_sale: bool = False


class ProductCardSchema(BaseModel):
    """Tarjeta del catálogo: el producto, sin sus variantes."""
    id: int
    name: str
    slug: str
    category: str
    category_id: int
    category_slug: str
    image: Optional[str] = None
    image_srcset: str = ""
    sku: Optional[str] = None
    price: float
    original_price: float
    on_sale: bool = False
    specs: Dict[str, str] = {}
    extras: Dict[str, Any] = {}
    # Valores distintos por característica. Reemplaza a mandar todas las
    # variantes: el catálogo filtra productos (si CUALQUIER variante calza, el
    # producto aparece) y para eso alcanza con el conjunto de valores.
    # Noemi: 6 características con ~35 valores, en vez de 451 variantes.
    facets: Dict[str, List[str]] = {}


class CatalogoSchema(BaseModel):
    """
    Las dos proyecciones del catálogo en una sola respuesta.

    Se mandan juntas porque las dos vistas comparten el mismo hook y filtran
    en memoria: pedirlas por separado obligaría a dos viajes.
    """
    products: List[ProductCardSchema] = []
    looks: List[LookSchema] = []


@router.get("/looks", response_model=CatalogoSchema)
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
    tarjetas: List[ProductCardSchema] = []

    for p in productos:
        skus = list(p.skus)
        precio_de = {s.id: compute_effective_price(s, p, now) for s in skus}
        imagen_de = {s.id: imagen_de_variante(s) for s in skus}
        # Por URL y no por sku: el look guarda la foto que eligió, y varias
        # variantes pueden compartirla.
        srcset_por_url = {
            a.url: srcset_de(a)
            for a in (asset_de_variante(s) for s in skus) if a
        }

        # Precio del producto: el menor entre sus variantes. Sirve de respaldo
        # para la tarjeta que representa al producto entero (la que no apunta a
        # una variante concreta).
        efectivos = [precio_de[s.id][0] for s in skus] or [0]
        base_min = min([s.price for s in skus] or [0])

        por_sku = {s.sku: s for s in skus}
        # Respaldo de imagen: portada del producto o, si no tiene, cualquier foto
        # de sus variantes. Una tarjeta con la foto del producto comunica más que
        # un recuadro vacío cuando esa combinación todavía no tiene foto propia.
        asset_portada = (p.media_assets[0] if p.media_assets else None) \
            or next((a for a in (asset_de_variante(s) for s in skus) if a), None)
        portada = asset_portada.url if asset_portada else None
        portada_srcset = srcset_de(asset_portada) if asset_portada else ""

        # Facetas: valores distintos por característica, preservando el orden de
        # aparición para que el filtro no baile entre cargas.
        facets: Dict[str, List[str]] = {}
        for s in skus:
            for nombre, valor in (s.config or {}).items():
                if valor in (None, ""):
                    continue
                vals = facets.setdefault(nombre, [])
                if valor not in vals:
                    vals.append(valor)

        tarjetas.append(ProductCardSchema(
            id=p.id,
            name=p.name,
            slug=p.slug,
            category=p.category.name,
            category_id=p.category_id,
            category_slug=p.category.slug,
            image=portada,
            image_srcset=portada_srcset,
            sku=next((s.sku for s in skus if imagen_de[s.id] and imagen_de[s.id] == portada), None),
            price=min(efectivos),
            original_price=base_min,
            on_sale=any(precio_de[s.id][1] for s in skus),
            specs=p.specs or {},
            extras=_extras_con_carrusel(p),
            facets=facets,
        ))

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
                # El srcset tiene que corresponder a la MISMA foto que `image`:
                # si el look cae en la portada del producto, va el de la portada.
                image_srcset=(srcset_por_url.get(look["image"], "") if look["image"] else portada_srcset),
                sku=look["sku"],
                config=look["config"],
                facets=look.get("facets", {}),
                price=precio,
                original_price=original,
                on_sale=en_oferta,
            ))

    return CatalogoSchema(products=tarjetas, looks=salida)


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
            "image_urls": [m.url for m in s.media_assets],
            # Derivadas por cada foto de la variante. La galería mostraba
            # 633x1013 y bajaba 1641x2048: 17,6 MB en la ficha de un producto.
            "image_srcsets": [srcset_de(m) for m in s.media_assets],
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
        "image_srcset": srcset_de(product.media_assets[0]) if product.media_assets else "",
        "images": [{"url": m.url, "srcset": srcset_de(m), "config_match": {}, "is_main": (i == 0), "ui_config": {}} for i, m in enumerate(product.media_assets)],
        "skus": skus_data
    }
