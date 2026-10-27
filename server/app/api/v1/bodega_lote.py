"""
Movimientos de bodega en bloque, desde Catálogo -> Bodega. Rutas delgadas: la
regla vive en core/bodega/. Un lote es todo o nada: 400 si está mal pedido,
409 si la bodega no lo permite, con las variantes que lo impiden.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session

from app.api.deps import RequirePermiso
from app.core import bodega
from app.core.sockets import manager
from app.database import get_session

router = APIRouter(dependencies=[Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))])


class LoteSumar(BaseModel):
    sku_ids: List[int]
    tipo: str          # "ingreso" o "merma"
    cantidad: int
    motivo: str


class FilaConteo(BaseModel):
    sku_id: int
    esperado: int
    contado: int


class LoteConteo(BaseModel):
    filas: List[FilaConteo]
    motivo: str


async def _registrar(db: Session, escribir) -> dict:
    try:
        movimientos = escribir()
    except bodega.LoteInvalido as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except bodega.LoteRechazado as e:
        db.rollback()
        raise HTTPException(status_code=409, detail={"mensaje": e.mensaje, "filas": e.filas})
    db.commit()
    # Un aviso por lote, no uno por variante.
    await manager.broadcast({"type": "invalidate_cache", "resource": "products"})
    return {
        "ok": True,
        "movimientos": len(movimientos),
        "referencia": movimientos[0].reference_id if movimientos else None,
    }


@router.post("/kardex/lote/sumar")
async def sumar(data: LoteSumar, db: Session = Depends(get_session)):
    """La misma cantidad a todas: ingreso (suma) o merma (resta)."""
    return await _registrar(db, lambda: bodega.sumar_a_todas(db, data.sku_ids, data.tipo, data.cantidad, data.motivo))


@router.post("/kardex/lote/conteo")
async def conteo(data: LoteConteo, db: Session = Depends(get_session)):
    """Lo contado en cada una; se anota la diferencia como ajuste."""
    filas = [bodega.Contada(sku_id=f.sku_id, esperado=f.esperado, contado=f.contado) for f in data.filas]
    return await _registrar(db, lambda: bodega.ajustar_a_conteo(db, filas, data.motivo))
