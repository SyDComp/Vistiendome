"""
Lo que hay libre para vender: variantes con disponible en bodega (lo que no
está apartado para pedidos) y piezas únicas disponibles.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional

from sqlmodel import Session, select

from ...models.catalog import SKU, Product
from ...models.piezas import EstadoPieza, PiezaUnica
from ..pedidos import ciclo
from ..pricing import compute_effective_price, get_chile_time


@dataclass
class Libre:
    tipo: str                          # "variante" o "pieza"
    nombre: str
    disponible: int
    config: Dict[str, str] = field(default_factory=dict)
    sku_id: Optional[int] = None
    pieza_id: Optional[str] = None
    producto_id: Optional[int] = None
    categoria_id: Optional[int] = None
    codigo: Optional[str] = None
    barcode: Optional[str] = None
    precio: Optional[int] = None       # el vigente del catálogo; las piezas, sin precio


def variante(sku: SKU, producto: Product, disponible: int, ahora=None) -> Libre:
    precio, _, _ = compute_effective_price(sku, producto, ahora or get_chile_time())
    return Libre(
        tipo="variante", sku_id=sku.id, producto_id=producto.id, categoria_id=producto.category_id,
        nombre=producto.name, codigo=sku.sku, barcode=sku.barcode, config=sku.config or {},
        disponible=disponible, precio=round(precio) if precio else None,
    )


def variantes_libres(db: Session, producto_id: Optional[int] = None) -> List[Libre]:
    consulta = (select(SKU, Product).join(Product, SKU.product_id == Product.id)
                .where(SKU.is_deleted == False, Product.is_deleted == False))  # noqa: E712
    if producto_id is not None:
        consulta = consulta.where(Product.id == producto_id)
    filas = db.exec(consulta).all()
    bodega = ciclo.bodega_de(db, [sku.id for sku, _ in filas])
    ahora = get_chile_time()
    return [variante(sku, producto, bodega[sku.id].disponible, ahora)
            for sku, producto in filas if sku.id in bodega and bodega[sku.id].disponible > 0]


def piezas_libres(db: Session) -> List[Libre]:
    return [
        Libre(tipo="pieza", pieza_id=p.id, nombre=p.nombre, codigo=f"Pieza única N° {p.numero}",
              config={**(p.config or {}), **(p.config_propuesta or {})}, disponible=1)
        for p in db.exec(select(PiezaUnica).where(PiezaUnica.estado == EstadoPieza.DISPONIBLE)).all()
    ]
