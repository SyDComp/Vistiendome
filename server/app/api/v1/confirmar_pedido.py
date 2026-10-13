"""
Confirmar un pedido desde el panel.

La regla vive en core/pedidos/ciclo/: acá solo se traduce a HTTP.
"""

from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlmodel import Session

from app.api.deps import RequirePermiso
from app.api.v1.crm import leer_pedidos
from app.database import get_session
from app.core.pedidos import ciclo, historia
from app.models.crm import Cotizacion
from app.models.iam import CuentaAcceso

router = APIRouter()
_ADMIN = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))


class PrendaPropuestaSalida(BaseModel):
    item_id: str
    nombre: str
    cantidad: int
    precio: Optional[float] = None
    propuesto: Optional[str] = None
    camino: Optional[str] = None
    opciones: List[str] = []
    queda: Optional[str] = None
    disponible: Optional[int] = None
    categoria_dice: str = ""
    aviso: Optional[str] = None
    requiere_nota: bool = False


class PropuestaSalida(BaseModel):
    prendas: List[PrendaPropuestaSalida]
    # Lo que impide confirmar tal como está (sin contar la nota, que se
    # escribe en la misma pantalla).
    problemas: List[str] = []


class ConfirmarEntrada(BaseModel):
    # {prenda_id: BODEGA o TALLER}. Lo que no venga queda como lo propone el sistema.
    caminos: Dict[str, str] = {}
    nota: Optional[str] = Field(default=None, max_length=500)
    # Las prendas que la persona vio "esperando bodega" al decidir.
    esperando_vistas: List[str] = []


def _salida(propuesta, problemas=()) -> PropuestaSalida:
    return PropuestaSalida(
        prendas=[PrendaPropuestaSalida(**vars(p)) for p in propuesta],
        problemas=list(problemas),
    )


def _pedido(db: Session, cotizacion_id: str) -> Cotizacion:
    cotizacion = db.get(Cotizacion, cotizacion_id)
    if not cotizacion:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return cotizacion


@router.post("/cotizaciones/{cotizacion_id}/propuesta", response_model=PropuestaSalida)
def propuesta(cotizacion_id: str, data: ConfirmarEntrada, db: Session = Depends(get_session), admin: CuentaAcceso = _ADMIN):
    """
    Cómo quedaría el pedido al confirmarlo con esos caminos. No guarda nada.

    POST y no GET porque lleva lo que la persona va eligiendo: cambiar una
    prenda de camino cambia lo que queda libre para las demás.
    """
    cotizacion = _pedido(db, cotizacion_id)
    prendas = ciclo.proponer(db, cotizacion, data.caminos)
    return _salida(prendas, ciclo.problemas(cotizacion, prendas, nota=None, pedir_nota=False))


@router.post("/cotizaciones/{cotizacion_id}/confirmar")
def confirmar(cotizacion_id: str, data: ConfirmarEntrada, db: Session = Depends(get_session), admin: CuentaAcceso = _ADMIN):
    """
    Confirma el pedido. 409 si falta algo (`detail` lo dice) o si la bodega
    cambió desde que se vio la propuesta (`propuesta` trae la nueva).
    """
    cotizacion = _pedido(db, cotizacion_id)
    try:
        ciclo.confirmar(db, cotizacion, data.caminos, data.nota, set(data.esperando_vistas),
                        historia.de_cuenta(admin))
    except ciclo.CambioLaBodega as e:
        db.rollback()
        return JSONResponse(status_code=409, content={
            "detail": str(e),
            "propuesta": _salida(e.propuesta).model_dump(),
        })
    except ciclo.NoSeConfirma as e:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(e))
    db.commit()
    db.refresh(cotizacion)
    return leer_pedidos(db, [cotizacion])[0]
