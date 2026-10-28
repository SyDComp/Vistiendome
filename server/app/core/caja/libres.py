"""
Lo que la caja muestra: las variantes con su disponible en bodega (lo que no
está apartado para pedidos; 0 si no queda) y las piezas únicas disponibles.
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


def variantes_del_catalogo(db: Session, producto_id: Optional[int] = None) -> List[Libre]:
    """
    Todas las vigentes, con su disponible (0 si no queda). La caja las muestra
    todas: lo que no hay sale como "sin stock", no se esconde, para que se vea
    que la prenda existe (decisión del usuario 2026-10-28). Venderla igual no
    se puede: la venta revisa la bodega.
    """
    consulta = (select(SKU, Product).join(Product, SKU.product_id == Product.id)
                .where(SKU.is_deleted == False, Product.is_deleted == False))  # noqa: E712
    if producto_id is not None:
        consulta = consulta.where(Product.id == producto_id)
    filas = db.exec(consulta).all()
    bodega = ciclo.bodega_de(db, [sku.id for sku, _ in filas])
    ahora = get_chile_time()
    return [variante(sku, producto, max(0, bodega[sku.id].disponible) if sku.id in bodega else 0, ahora)
            for sku, producto in filas]


def variantes_libres(db: Session, producto_id: Optional[int] = None) -> List[Libre]:
    """Solo las que tienen disponible: lo que se puede vender ahora."""
    return [x for x in variantes_del_catalogo(db, producto_id) if x.disponible > 0]


def piezas_libres(db: Session) -> List[Libre]:
    return [
        Libre(tipo="pieza", pieza_id=p.id, nombre=p.nombre, codigo=f"Pieza única N° {p.numero}",
              config={**(p.config or {}), **(p.config_propuesta or {})}, disponible=1)
        for p in db.exec(select(PiezaUnica).where(PiezaUnica.estado == EstadoPieza.DISPONIBLE)).all()
    ]
