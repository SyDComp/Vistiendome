"""
Órdenes de corte.

Producción, no ventas: Paola arma la orden con lo que va a cortar, sea para
cumplir pedidos o para tener stock. Por eso vive aparte del CRM.

Al finalizar una orden el sistema cierra el círculo solo:
  - las líneas que vinieron de un pedido marcan esa pieza como cortada;
  - las que eran para stock entran al inventario como unidades producidas.
Sin eso, cortar 20 prendas para stock obligaría a cargarlas a mano en Bodega.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from sqlalchemy import text
from pydantic import BaseModel

from app.database import get_session
from app.models.taller import OrdenCorte, OrdenCorteItem, EstadoOrdenCorte
from app.models.crm import CotizacionItem, Cotizacion
from app.models.catalog import SKU, StockMovement, MovementType
from app.models.iam import CuentaAcceso
from app.api.deps import RequirePermiso

router = APIRouter()

_ADMIN = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))


# --- Esquemas ---

class ItemEntrada(BaseModel):
    sku_id: int
    cantidad: int = 1
    cotizacion_item_id: Optional[str] = None


class OrdenCrear(BaseModel):
    notas: Optional[str] = None
    items: List[ItemEntrada] = []


class EstadoEntrada(BaseModel):
    estado: EstadoOrdenCorte


class ItemSalida(BaseModel):
    id: str
    sku_id: int
    sku: Optional[str] = None
    producto: Optional[str] = None
    config: Dict[str, Any] = {}
    cantidad: int
    cotizacion_item_id: Optional[str] = None
    # Para que la pantalla distinga de un vistazo el origen de cada línea
    para_stock: bool = False
    pedido_numero: Optional[int] = None
    cliente: Optional[str] = None


class OrdenSalida(BaseModel):
    id: str
    numero: Optional[int] = None
    estado: EstadoOrdenCorte
    notas: Optional[str] = None
    repetida_de_id: Optional[str] = None
    repetida_de_numero: Optional[int] = None
    veces_repetida: int = 0
    created_at: datetime
    finalizada_at: Optional[datetime] = None
    total_unidades: int = 0
    items: List[ItemSalida] = []


def _salida(orden: OrdenCorte, db: Session) -> OrdenSalida:
    items: List[ItemSalida] = []
    for it in orden.items:
        sku = it.sku or db.get(SKU, it.sku_id)
        cot_item = db.get(CotizacionItem, it.cotizacion_item_id) if it.cotizacion_item_id else None
        cot = cot_item.cotizacion if cot_item else None
        persona = cot.persona if cot else None
        items.append(ItemSalida(
            id=it.id,
            sku_id=it.sku_id,
            sku=sku.sku if sku else None,
            producto=sku.product.name if sku and sku.product else None,
            config=(sku.config or {}) if sku else {},
            cantidad=it.cantidad,
            cotizacion_item_id=it.cotizacion_item_id,
            para_stock=it.cotizacion_item_id is None,
            pedido_numero=cot.numero if cot else None,
            cliente=f"{persona.nombres} {persona.apellidos}".strip() if persona else None,
        ))

    repetida_de = db.get(OrdenCorte, orden.repetida_de_id) if orden.repetida_de_id else None
    veces = len(db.exec(
        select(OrdenCorte).where(OrdenCorte.repetida_de_id == orden.id)
    ).all())

    return OrdenSalida(
        id=orden.id,
        numero=orden.numero,
        estado=orden.estado,
        notas=orden.notas,
        repetida_de_id=orden.repetida_de_id,
        repetida_de_numero=repetida_de.numero if repetida_de else None,
        veces_repetida=veces,
        created_at=orden.created_at,
        finalizada_at=orden.finalizada_at,
        total_unidades=sum(i.cantidad for i in orden.items),
        items=items,
    )


# --- Lo que falta cortar (para armar una orden) ---

@router.get("/pendientes")
def piezas_pendientes(
    estado: Optional[str] = "CONFIRMADA",
    db: Session = Depends(get_session),
    admin: CuentaAcceso = _ADMIN,
):
    """
    Piezas de pedidos que todavía no están en ninguna orden de corte activa.

    Es la materia prima para armar una orden, no la orden en sí. Se excluye lo
    que ya está en una orden viva para no cortar dos veces lo mismo.

    Por omisión sólo pedidos CONFIRMADA: cortar tela es irreversible y cuesta
    material, así que no entra lo que la clienta todavía no aceptó. Se puede
    ampliar con ?estado=TODAS.
    """
    ya_asignados = {
        oi.cotizacion_item_id
        for oi in db.exec(
            select(OrdenCorteItem)
            .join(OrdenCorte, OrdenCorteItem.orden_id == OrdenCorte.id)
            .where(OrdenCorte.estado != EstadoOrdenCorte.CANCELADA)
        ).all()
        if oi.cotizacion_item_id
    }

    query = select(CotizacionItem).join(Cotizacion, CotizacionItem.cotizacion_id == Cotizacion.id)
    if estado and estado != "TODAS":
        query = query.where(Cotizacion.estado == estado)
    else:
        query = query.where(Cotizacion.estado != "CANCELADA")

    filas = []
    for it in db.exec(query.order_by(Cotizacion.created_at.asc())).all():
        if it.id in ya_asignados or it.cortado or not it.sku:
            continue
        cot = it.cotizacion
        persona = cot.persona if cot else None
        filas.append({
            "cotizacion_item_id": it.id,
            "sku_id": it.sku_id,
            "sku": it.sku.sku,
            "producto": it.sku.product.name if it.sku.product else "—",
            "config": it.sku.config or {},
            "cantidad": it.cantidad,
            "pedido_numero": cot.numero if cot else None,
            "cliente": f"{persona.nombres} {persona.apellidos}".strip() if persona else "—",
            "fecha": cot.created_at.isoformat() if cot else None,
        })
    return filas


# --- Órdenes ---

@router.get("/", response_model=List[OrdenSalida])
def listar(estado: Optional[EstadoOrdenCorte] = None, db: Session = Depends(get_session), admin: CuentaAcceso = _ADMIN):
    q = select(OrdenCorte).order_by(OrdenCorte.created_at.desc())
    if estado:
        q = q.where(OrdenCorte.estado == estado)
    return [_salida(o, db) for o in db.exec(q).all()]


@router.get("/{orden_id}", response_model=OrdenSalida)
def obtener(orden_id: str, db: Session = Depends(get_session), admin: CuentaAcceso = _ADMIN):
    orden = db.get(OrdenCorte, orden_id)
    if not orden:
        raise HTTPException(status_code=404, detail="Orden de corte no encontrada")
    return _salida(orden, db)


@router.post("/", response_model=OrdenSalida)
def crear(data: OrdenCrear, db: Session = Depends(get_session), admin: CuentaAcceso = _ADMIN):
    if not data.items:
        raise HTTPException(status_code=400, detail="La orden necesita al menos una pieza")

    numero = db.execute(text("SELECT nextval('ordenes_corte_numero_seq')")).scalar_one()
    orden = OrdenCorte(numero=numero, notas=data.notas)
    db.add(orden)
    db.commit()
    db.refresh(orden)

    for entrada in data.items:
        if not db.get(SKU, entrada.sku_id):
            raise HTTPException(status_code=404, detail=f"Variante {entrada.sku_id} no encontrada")
        if entrada.cantidad <= 0:
            raise HTTPException(status_code=400, detail="La cantidad debe ser mayor que cero")
        db.add(OrdenCorteItem(
            orden_id=orden.id,
            sku_id=entrada.sku_id,
            cantidad=entrada.cantidad,
            cotizacion_item_id=entrada.cotizacion_item_id,
        ))
    db.commit()
    db.refresh(orden)
    return _salida(orden, db)


def _aplicar_finalizacion(db: Session, orden: OrdenCorte, finalizando: bool) -> None:
    """
    Cierra (o revierte) el efecto de finalizar una orden.

    Idempotente por `reference_id`: marcar finalizada dos veces no suma el stock
    dos veces, y revertir no deja movimientos huérfanos.
    """
    for it in orden.items:
        if it.cotizacion_item_id:
            # Vino de un pedido: la pieza queda (o deja de estar) cortada.
            cot_item = db.get(CotizacionItem, it.cotizacion_item_id)
            if cot_item:
                cot_item.cortado = finalizando
                db.add(cot_item)
            continue

        # Para stock: las unidades producidas entran al inventario.
        existente = db.exec(
            select(StockMovement).where(
                StockMovement.sku_id == it.sku_id,
                StockMovement.type == MovementType.RECEIPT,
                StockMovement.reference_id == it.id,
            )
        ).first()

        if finalizando and not existente:
            db.add(StockMovement(
                sku_id=it.sku_id,
                type=MovementType.RECEIPT,
                quantity=it.cantidad,
                reference_id=it.id,
                note=f"Orden de corte N° {orden.numero}",
            ))
        elif not finalizando and existente:
            db.delete(existente)


@router.put("/{orden_id}/estado", response_model=OrdenSalida)
def cambiar_estado(orden_id: str, data: EstadoEntrada, db: Session = Depends(get_session), admin: CuentaAcceso = _ADMIN):
    orden = db.get(OrdenCorte, orden_id)
    if not orden:
        raise HTTPException(status_code=404, detail="Orden de corte no encontrada")

    anterior = orden.estado
    nuevo = data.estado
    if anterior == nuevo:
        return _salida(orden, db)

    entra = nuevo == EstadoOrdenCorte.FINALIZADA and anterior != EstadoOrdenCorte.FINALIZADA
    sale = anterior == EstadoOrdenCorte.FINALIZADA and nuevo != EstadoOrdenCorte.FINALIZADA
    if entra or sale:
        _aplicar_finalizacion(db, orden, finalizando=entra)

    orden.estado = nuevo
    orden.finalizada_at = datetime.utcnow() if entra else (None if sale else orden.finalizada_at)
    orden.updated_at = datetime.utcnow()
    db.add(orden)
    db.commit()
    db.refresh(orden)
    return _salida(orden, db)


@router.post("/{orden_id}/repetir", response_model=OrdenSalida)
def repetir(orden_id: str, db: Session = Depends(get_session), admin: CuentaAcceso = _ADMIN):
    """
    Crea una orden nueva con las mismas piezas.

    Las líneas que venían de un pedido se copian SIN ese vínculo: ese pedido ya
    se cortó una vez y no se vuelve a marcar. Repetir es producir de nuevo lo
    mismo, normalmente para stock.
    """
    original = db.get(OrdenCorte, orden_id)
    if not original:
        raise HTTPException(status_code=404, detail="Orden de corte no encontrada")
    if not original.items:
        raise HTTPException(status_code=400, detail="La orden no tiene piezas que repetir")

    numero = db.execute(text("SELECT nextval('ordenes_corte_numero_seq')")).scalar_one()
    nueva = OrdenCorte(
        numero=numero,
        notas=f"Repetición de la orden N° {original.numero}",
        repetida_de_id=original.id,
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)

    for it in original.items:
        db.add(OrdenCorteItem(orden_id=nueva.id, sku_id=it.sku_id, cantidad=it.cantidad))
    db.commit()
    db.refresh(nueva)
    return _salida(nueva, db)


@router.delete("/{orden_id}")
def eliminar(orden_id: str, db: Session = Depends(get_session), admin: CuentaAcceso = _ADMIN):
    orden = db.get(OrdenCorte, orden_id)
    if not orden:
        raise HTTPException(status_code=404, detail="Orden de corte no encontrada")
    if orden.estado == EstadoOrdenCorte.FINALIZADA:
        raise HTTPException(
            status_code=403,
            detail="Una orden finalizada no se borra: ya movió stock y marcó piezas cortadas. Cancélala si hace falta.",
        )
    for it in list(orden.items):
        db.delete(it)
    db.delete(orden)
    db.commit()
    return {"ok": True}
