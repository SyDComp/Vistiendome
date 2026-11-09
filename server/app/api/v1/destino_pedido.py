"""
Cambiar a dónde va un pedido, y pasar la ubicación de una clienta a sus
pedidos por despachar. La regla vive en core/pedidos/destino.py.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session

from app.api.deps import RequirePermiso
from app.api.v1.crm import leer_pedidos
from app.core.pedidos import destino, historia
from app.database import get_session
from app.models.crm import Cotizacion
from app.models.iam import CuentaAcceso, Persona

router = APIRouter()
_ADMIN = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))


class DestinoEntrada(BaseModel):
    modo_entrega: str
    tipo_despacho: Optional[str] = None
    transporte: Optional[str] = None
    region: Optional[str] = None
    comuna: Optional[str] = None
    comuna_id: Optional[int] = None
    direccion: Optional[str] = None


class PedidoCorto(BaseModel):
    id: str
    numero: Optional[int] = None


@router.put("/cotizaciones/{cotizacion_id}/destino")
def cambiar_destino(cotizacion_id: str, data: DestinoEntrada, db: Session = Depends(get_session),
                    admin: CuentaAcceso = _ADMIN):
    cotizacion = db.get(Cotizacion, cotizacion_id)
    if not cotizacion:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    try:
        destino.cambiar(db, cotizacion, destino.Destino(**data.model_dump()), historia.de_cuenta(admin))
    except destino.NoSeCambiaDestino as e:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(e))
    db.commit()
    db.refresh(cotizacion)
    return leer_pedidos(db, [cotizacion])[0]


def _clienta(db: Session, cliente_id: str) -> Persona:
    persona = db.get(Persona, cliente_id)
    if not persona:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return persona


@router.get("/clientes/{cliente_id}/por-despachar", response_model=List[PedidoCorto])
def por_despachar(cliente_id: str, db: Session = Depends(get_session), admin: CuentaAcceso = _ADMIN):
    """Sus pedidos con despacho que todavía no salen: a los que se les puede pasar su ubicación."""
    return [PedidoCorto(id=c.id, numero=c.numero) for c in destino.por_despachar(db, _clienta(db, cliente_id))]


@router.post("/clientes/{cliente_id}/destino-a-pedidos")
def destino_a_pedidos(cliente_id: str, db: Session = Depends(get_session), admin: CuentaAcceso = _ADMIN):
    """Sus pedidos por despachar toman su ubicación de hoy. Dice cuáles cambiaron y cuáles no, y por qué."""
    try:
        resultado = destino.de_la_clienta(db, _clienta(db, cliente_id), historia.de_cuenta(admin))
    except destino.NoSeCambiaDestino as e:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(e))
    db.commit()
    return resultado
