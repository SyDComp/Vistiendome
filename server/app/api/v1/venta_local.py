"""
Venta rápida en el local, desde el panel: lo que se puede vender y la venta.

La regla vive en core/pedidos/venta_rapida.py: acá solo se traduce a HTTP.
"""

from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlmodel import Session, select

from app.api.deps import RequirePermiso
from app.api.v1.crm import leer_pedidos
from app.core.pedidos import ciclo, historia
from app.core.pedidos.venta_rapida import Clienta, NoSeVende, PagoVenta, PrendaVenta, vender
from app.core.pricing import compute_effective_price, get_chile_time
from app.database import get_session
from app.models.catalog import Product, SKU
from app.models.iam import CuentaAcceso
from app.models.piezas import EstadoPieza, PiezaUnica

router = APIRouter(dependencies=[Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))])


class Disponible(BaseModel):
    """Algo que se puede vender ahora: una variante con disponible, o una pieza única."""
    tipo: str                         # "variante" o "pieza"
    sku_id: Optional[int] = None
    pieza_id: Optional[str] = None
    producto_id: Optional[int] = None
    nombre: str
    codigo: Optional[str] = None      # el SKU, o "Pieza única N° 3"
    config: Dict[str, str] = {}
    disponible: int
    precio: Optional[int] = None      # el vigente del catálogo; las piezas, sin precio
    barcode: Optional[str] = None


class ClientaEntrada(BaseModel):
    persona_id: Optional[str] = None
    rut: Optional[str] = Field(default=None, max_length=12)
    nombres: str = Field(default="", max_length=100)
    apellidos: str = Field(default="", max_length=100)
    telefono: Optional[str] = Field(default=None, max_length=20)


class PrendaEntrada(BaseModel):
    sku_id: Optional[int] = None
    pieza_id: Optional[str] = None
    cantidad: int = Field(default=1, ge=1)
    precio: Optional[float] = Field(default=None, gt=0)
    sin_costo: bool = False


class PagoEntrada(BaseModel):
    monto: int = Field(gt=0)
    medio: str = Field(max_length=60)
    nota: Optional[str] = Field(default=None, max_length=300)


class VentaEntrada(BaseModel):
    # Sin clienta: venta sin datos.
    clienta: Optional[ClientaEntrada] = None
    prendas: List[PrendaEntrada]
    pagos: List[PagoEntrada] = []


def _variante(sku: SKU, producto: Product, disponible: int, ahora) -> Disponible:
    precio, _, _ = compute_effective_price(sku, producto, ahora)
    return Disponible(
        tipo="variante", sku_id=sku.id, producto_id=producto.id, nombre=producto.name, codigo=sku.sku, barcode=sku.barcode,
        config=sku.config or {}, disponible=disponible, precio=round(precio) if precio else None,
    )


@router.get("/codigo/{codigo}", response_model=Disponible)
def por_codigo(codigo: str, db: Session = Depends(get_session)):
    """
    Lo que leyó la pistola: el código de barras de la etiqueta (o el código
    de la variante, escrito a mano). 404 si no existe; 409 si existe pero no
    queda libre, diciendo cuál es.
    """
    limpio = codigo.strip()
    fila = db.exec(
        select(SKU, Product).join(Product, SKU.product_id == Product.id)
        .where(SKU.is_deleted == False, Product.is_deleted == False)  # noqa: E712
        .where((SKU.barcode == limpio) | (func.upper(SKU.sku) == limpio.upper()))
    ).first()
    if not fila:
        raise HTTPException(status_code=404, detail=f"No hay ninguna prenda con el código {limpio}.")
    sku, producto = fila
    b = ciclo.bodega_de(db, [sku.id]).get(sku.id)
    libres = b.disponible if b else 0
    if libres <= 0:
        detalle = " / ".join(str(v) for v in (sku.config or {}).values() if v)
        raise HTTPException(status_code=409, detail=f"No queda disponible de {producto.name} ({detalle}): "
                                                     "lo que hay está apartado para pedidos o no hay en bodega.")
    return _variante(sku, producto, libres, get_chile_time())


@router.get("/disponible", response_model=List[Disponible])
def disponible(db: Session = Depends(get_session)):
    """Lo que hay libre para vender: variantes con disponible > 0 y piezas únicas disponibles."""
    variantes = db.exec(
        select(SKU, Product).join(Product, SKU.product_id == Product.id)
        .where(SKU.is_deleted == False, Product.is_deleted == False)  # noqa: E712
    ).all()
    bodega = ciclo.bodega_de(db, [sku.id for sku, _ in variantes])
    ahora = get_chile_time()
    filas = []
    for sku, producto in variantes:
        b = bodega.get(sku.id)
        if not b or b.disponible <= 0:
            continue
        filas.append(_variante(sku, producto, b.disponible, ahora))
    for pieza in db.exec(select(PiezaUnica).where(PiezaUnica.estado == EstadoPieza.DISPONIBLE)).all():
        filas.append(Disponible(
            tipo="pieza", pieza_id=pieza.id, nombre=pieza.nombre, codigo=f"Pieza única N° {pieza.numero}",
            config={**(pieza.config or {}), **(pieza.config_propuesta or {})}, disponible=1,
        ))
    return filas


@router.post("")
def registrar_venta(data: VentaEntrada, db: Session = Depends(get_session),
                    admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))):
    """La venta completa en un paso: queda entera o no queda nada."""
    try:
        cotizacion = vender(
            db,
            Clienta(**data.clienta.model_dump()) if data.clienta else None,
            [PrendaVenta(**p.model_dump()) for p in data.prendas],
            [PagoVenta(**p.model_dump()) for p in data.pagos],
            historia.de_cuenta(admin),
        )
    except NoSeVende as e:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(e))
    db.commit()
    db.refresh(cotizacion)
    return leer_pedidos(db, [cotizacion])[0]
