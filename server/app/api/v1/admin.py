from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from ...database import get_session
from ...models.iam import CuentaAcceso
from ...api.deps import RequirePermiso

router = APIRouter()

# TODO: Refactorizar estos endpoints utilizando los flujos PBAC completos y el modelo Persona.

@router.get("/users")
def list_users(
    current_admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR")),
    db: Session = Depends(get_session)
):
    """Listado completo de cuentas_acceso para el administrador"""
    users = db.exec(select(CuentaAcceso)).all()
    return users
