"""
Dónde se usa una foto de la Galería, y quitarla de todos esos lugares.

Antes la revisión no miraba las colecciones (su portada era texto), y al
borrar una foto la portada, la bienvenida y el carrusel de los productos
seguían nombrándola: en el sitio quedaba una imagen rota. Ahora, al borrar,
la foto sale de todo lo que la usaba, igual que ya salía de los productos.
"""

from typing import Dict, List, Set

from sqlmodel import Session, delete, select

from ...models.catalog import Collection, MediaAsset, Product, ProductMediaLink, SKU, SKUMediaLink
from ...models.cms import HomepageSection
from ...models.settings import SiteSetting
from . import referencias_json

NOMBRES_AJUSTE = {
    "welcome_modal": "Modal de Bienvenida",
    "top_banner": "Barra de Anuncios",
    "nosotros": "Página Nosotros",
}


def _agujas(asset: MediaAsset) -> Set[str]:
    return {(asset.url or "").lower(), (asset.filename or "").lower()} - {""}


def donde_se_usa(db: Session, asset: MediaAsset) -> List[Dict]:
    """Cada lugar que usa la foto, en palabras para la tienda."""
    usos = []
    for product in db.exec(
        select(Product).join(ProductMediaLink, ProductMediaLink.product_id == Product.id)
        .where(ProductMediaLink.media_asset_id == asset.id)
    ).all():
        usos.append({"type": "product", "name": f"Producto: {product.name}", "id": product.id})
    for sku, product in db.exec(
        select(SKU, Product).join(SKUMediaLink, SKUMediaLink.sku_id == SKU.id)
        .join(Product, Product.id == SKU.product_id).where(SKUMediaLink.media_asset_id == asset.id)
    ).all():
        usos.append({"type": "sku", "name": f"Variante: {product.name} ({sku.sku})", "id": sku.id})
    for coleccion in db.exec(select(Collection).where(Collection.portada_id == asset.id)).all():
        usos.append({"type": "collection", "name": f"Portada de la colección: {coleccion.name}", "id": coleccion.id})
    agujas = _agujas(asset)
    for sec in db.exec(select(HomepageSection)).all():
        if referencias_json.usa(sec.config, asset.id, agujas):
            usos.append({"type": "homepage", "name": f"Portada - Sección: {sec.title} ({sec.type})", "id": sec.id})
    for st in db.exec(select(SiteSetting)).all():
        if referencias_json.usa(st.value, asset.id, agujas):
            usos.append({"type": "setting", "name": f"Configuración: {NOMBRES_AJUSTE.get(st.key, st.key)}", "id": st.key})
    return usos


def quitar_de_todo(db: Session, asset: MediaAsset) -> None:
    """Saca la foto de productos, variantes, colecciones, portada y ajustes. No la borra ni hace commit."""
    db.exec(delete(SKUMediaLink).where(SKUMediaLink.media_asset_id == asset.id))
    db.exec(delete(ProductMediaLink).where(ProductMediaLink.media_asset_id == asset.id))
    for coleccion in db.exec(select(Collection).where(Collection.portada_id == asset.id)).all():
        coleccion.portada_id = None
        db.add(coleccion)
    agujas = _agujas(asset)
    # El carrusel del producto nombra sus fotos por `id` (o por dirección, los viejos) en `extras`.
    for producto in db.exec(select(Product)).all():
        carrusel = (producto.extras or {}).get("preview_carousel")
        if not carrusel:
            continue
        queda = [x for x in carrusel
                 if not (isinstance(x, dict) and x.get("id") == asset.id)
                 and not referencias_json.usa(x, asset.id, agujas)]
        if len(queda) != len(carrusel):
            producto.extras = {**producto.extras, "preview_carousel": queda}
            db.add(producto)
    for sec in db.exec(select(HomepageSection)).all():
        nuevo, cambio = referencias_json.quitar(sec.config, asset.id, agujas)
        if cambio:
            sec.config = nuevo
            db.add(sec)
    for st in db.exec(select(SiteSetting)).all():
        nuevo, cambio = referencias_json.quitar(st.value, asset.id, agujas)
        if cambio:
            st.value = nuevo
            db.add(st)
