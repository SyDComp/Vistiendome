"""
Los productos para el selector visual de la caja: los que tienen algo libre
para vender, con su foto y cuánto se vendieron, lo más vendido primero.
Las variantes de cada uno vienen de /disponible (venta_local.py).
"""

from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session, select

from app.api.deps import RequirePermiso
from app.core.imagenes import srcset_de
from app.core.pedidos import ciclo
from app.core.vendidos import vendidos_por_producto
from app.database import get_session
from app.models.catalog import SKU, MediaAsset, Product, ProductMediaLink

router = APIRouter(dependencies=[Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))])


class ProductoCaja(BaseModel):
    id: int
    nombre: str
    categoria: str = ""
    imagen: str = ""
    imagen_srcset: str = ""   # derivadas webp: la tarjeta no baja el original
    libres: int
    vendidos: int             # en los últimos 30 días


def _imagenes(db: Session, ids: List[int]) -> dict:
    """{producto_id: MediaAsset}: la principal, o cualquiera si no hay principal."""
    elegidas = {}
    for pid, principal, asset in db.exec(
        select(ProductMediaLink.product_id, ProductMediaLink.is_main, MediaAsset)
        .join(MediaAsset, ProductMediaLink.media_asset_id == MediaAsset.id)
        .where(ProductMediaLink.product_id.in_(ids))
    ).all():
        if pid not in elegidas or principal:
            elegidas[pid] = asset
    return elegidas


@router.get("/productos", response_model=List[ProductoCaja])
def productos(db: Session = Depends(get_session)):
    variantes = db.exec(
        select(SKU, Product).join(Product, SKU.product_id == Product.id)
        .where(SKU.is_deleted == False, Product.is_deleted == False)  # noqa: E712
    ).all()
    bodega = ciclo.bodega_de(db, [sku.id for sku, _ in variantes])
    libres, nombres = {}, {}
    for sku, producto in variantes:
        b = bodega.get(sku.id)
        if b and b.disponible > 0:
            libres[producto.id] = libres.get(producto.id, 0) + b.disponible
            nombres[producto.id] = producto
    vendidos = vendidos_por_producto(db)
    imagenes = _imagenes(db, list(libres))
    salida = [
        ProductoCaja(
            id=pid, nombre=p.name, categoria=p.category.name if p.category else "",
            imagen=imagenes[pid].url if pid in imagenes else "",
            imagen_srcset=srcset_de(imagenes[pid]) if pid in imagenes else "",
            libres=libres[pid], vendidos=vendidos.get(pid, 0),
        )
        for pid, p in nombres.items()
    ]
    return sorted(salida, key=lambda x: (-x.vendidos, x.nombre))
