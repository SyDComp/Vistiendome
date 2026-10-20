from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from ...database import get_session
from ...models.iam import CuentaAcceso
from ...api.deps import RequirePermiso

router = APIRouter()

# TODO: Refactorizar estos endpoints utilizando los flujos PBAC completos y el modelo Persona.

class CuentaSalida(BaseModel):
    """
    Lo que se muestra de una cuenta. Nunca la contraseña, ni cifrada: antes
    esta ruta devolvía la fila entera, `password_hash` incluido.
    """
    id: str
    email_corporativo: str
    apodo: Optional[str] = None


@router.get("/users", response_model=List[CuentaSalida])
def list_users(
    current_admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR")),
    db: Session = Depends(get_session)
):
    """Listado de cuentas_acceso para el administrador, sin contraseñas."""
    users = db.exec(select(CuentaAcceso)).all()
    return users
