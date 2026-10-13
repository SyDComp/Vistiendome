"""Corregir la fecha comprometida de un pedido confirmado (core/pedidos/fecha.py)."""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session

from app.api.deps import RequirePermiso
from app.api.v1.crm import leer_pedidos
from app.core.pedidos import historia
from app.core.pedidos import fecha as fecha_core
from app.database import get_session
from app.models.crm import Cotizacion
from app.models.iam import CuentaAcceso

router = APIRouter()


class FechaEntrada(BaseModel):
    fecha: date
    # Por qué cambia ("la tela llegó tarde"). Opcional, queda en la historia.
    nota: Optional[str] = Field(default=None, max_length=300)


@router.put("/cotizaciones/{cotizacion_id}/fecha")
def cambiar_fecha(cotizacion_id: str, data: FechaEntrada, db: Session = Depends(get_session),
                  admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))):
    cotizacion = db.get(Cotizacion, cotizacion_id)
    if not cotizacion:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    try:
        fecha_core.cambiar(db, cotizacion, data.fecha, data.nota, historia.de_cuenta(admin))
    except fecha_core.NoSeCambia as e:
        raise HTTPException(status_code=409, detail=str(e))
    db.commit()
    db.refresh(cotizacion)
    return leer_pedidos(db, [cotizacion])[0]
