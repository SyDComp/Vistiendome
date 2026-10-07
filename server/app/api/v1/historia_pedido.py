"""
La historia de un pedido y su "¿Cómo llegó?", desde el panel.

Aparte del CRM a propósito: crm.py ya hace demasiado, y esto es otra cosa:
leer lo anotado y corregir un dato que se anota al corregirlo.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session

from app.api.deps import RequirePermiso
from app.database import get_session
from app.core.pedidos import historia
from app.models.crm import Cotizacion
from app.models.historia import TipoEvento
from app.models.iam import CuentaAcceso

router = APIRouter(dependencies=[Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))])


class EventoSalida(BaseModel):
    id: str
    tipo: str
    datos: Dict[str, Any]
    actor_nombre: Optional[str] = None
    ocurrido_at: datetime


class CanalEntrada(BaseModel):
    canal: str = Field(min_length=1, max_length=60)


def _pedido(db: Session, cotizacion_id: str) -> Cotizacion:
    cotizacion = db.get(Cotizacion, cotizacion_id)
    if not cotizacion:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return cotizacion


@router.get("/cotizaciones/{cotizacion_id}/historia", response_model=List[EventoSalida])
def leer_historia(cotizacion_id: str, db: Session = Depends(get_session)):
    _pedido(db, cotizacion_id)
    return historia.historia_de(db, cotizacion_id)


@router.put("/cotizaciones/{cotizacion_id}/canal")
def corregir_canal(
    cotizacion_id: str,
    data: CanalEntrada,
    db: Session = Depends(get_session),
    admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR")),
):
    """
    Completar o corregir cómo llegó un pedido cargado en el panel.

    Los de la web llegaron por la web: eso no se corrige.
    """
    cotizacion = _pedido(db, cotizacion_id)
    if getattr(cotizacion.origen, "value", cotizacion.origen) != "MANUAL":
        raise HTTPException(status_code=409, detail="Este pedido llegó por el sitio web.")
    nuevo = data.canal.strip()
    if not nuevo:
        raise HTTPException(status_code=422, detail="Falta indicar cómo llegó el pedido.")
    if nuevo == cotizacion.canal:
        return {"canal": nuevo}
    historia.anotar(db, cotizacion, TipoEvento.CANAL, historia.de_cuenta(admin), de=cotizacion.canal, a=nuevo)
    cotizacion.canal = nuevo
    db.add(cotizacion)
    db.commit()
    return {"canal": nuevo}
