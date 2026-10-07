"""Cotizar las prendas de un pedido desde el panel."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session

from app.api.deps import RequirePermiso
from app.database import get_session
from app.core.pedidos import historia
from app.core.pedidos.cotizar import NoSeCotiza, cotizar
from app.models.crm import Cotizacion, CotizacionItem
from app.models.iam import CuentaAcceso

router = APIRouter()


class PrecioEntrada(BaseModel):
    # Sin monto y sin `sin_costo`: vuelve a "por cotizar".
    precio: Optional[float] = Field(default=None, gt=0)
    sin_costo: bool = False


@router.put("/cotizaciones/{cotizacion_id}/prendas/{item_id}/precio")
def cotizar_prenda(
    cotizacion_id: str,
    item_id: str,
    data: PrecioEntrada,
    db: Session = Depends(get_session),
    admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR")),
):
    cotizacion = db.get(Cotizacion, cotizacion_id)
    item = db.get(CotizacionItem, item_id)
    if not cotizacion or not item or item.cotizacion_id != cotizacion.id:
        raise HTTPException(status_code=404, detail="Prenda no encontrada en este pedido")
    try:
        guardado = cotizar(db, cotizacion, item, data.precio, data.sin_costo, historia.de_cuenta(admin))
    except NoSeCotiza:
        raise HTTPException(
            status_code=409,
            detail="El precio se cotiza mientras el pedido está nuevo o en conversación. Este ya está confirmado o cerrado.",
        )
    db.commit()
    return {"precio": guardado}
