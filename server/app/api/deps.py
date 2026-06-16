from typing import Any, Optional
from fastapi import Request, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
from sqlmodel import Session, select
import os

from ..database import get_session
from ..models.iam import CuentaAcceso, AuditoriaAccesoSensible
from ..core.security import ALGORITHM, SECRET_KEY

# Identificación de flujo
reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login"
)

def get_current_user(
    request: Request,
    db: Session = Depends(get_session)
) -> CuentaAcceso:
    """Extrae el portador del token desde la cabecera estándar de Authorización HTTP o desde Cookies"""
    auth = request.headers.get("Authorization")
    token = None

    if auth and auth.startswith("Bearer "):
        token = auth.split(" ")[1]
    else:
        # Intentar extraer de las cookies si no hay header
        token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Falta credencial de acceso (Header o Cookie)"
        )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Payload de token corrupto")
    except (JWTError, ValidationError):
         raise HTTPException(
             status_code=status.HTTP_403_FORBIDDEN, 
             detail="Firma expirada o token manipulado"
         )
         
    cuenta = db.get(CuentaAcceso, user_id)
    if not cuenta:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Cuenta ya no existe")
    
    if cuenta.estado.nombre != "ACTIVO":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Dominio Revocado: {cuenta.estado.nombre}")

    return cuenta

class RequirePermiso:
    """
    PBAC Logic: Determina en la ruta de FastAPI si el CurrentUser
    cuenta con una regla vigente en su mapeo de UsuarioPermisosDirectos.
    """
    def __init__(self, recurso: str, accion: str):
        self.recurso = recurso
        self.accion = accion
        
    def __call__(self, current_user: CuentaAcceso = Depends(get_current_user)):
        for upd in current_user.permisos_directos:
            # Validar integridad temporal
            if not upd.fecha_fin and upd.permiso.recurso == self.recurso and upd.permiso.accion == self.accion:
                return current_user
                
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Inviolabilidad PBAC. No tienes el permiso {self.recurso}:{self.accion}"
        )

class AuditorSensible:
    """
    Dependency Caller de Auditoría Ley Karin. 
    Intercepta en la propia declaración de la ruta y clona inmutablemente quién vio, 
    qué vio, cuándo lo vio y la IP sin entrometerse en la lógica del controlador de la ruta en sí.
    """
    def __init__(self, recurso: str, param_afectado: str):
        self.recurso = recurso
        self.param_afectado = param_afectado

    def __call__(self, request: Request, current_user: CuentaAcceso = Depends(get_current_user), db: Session = Depends(get_session)):
        # Extracción paramétrica agnóstica de path o queries
        afectado_id = request.path_params.get(self.param_afectado) or request.query_params.get(self.param_afectado)
        
        if afectado_id:
            audit = AuditoriaAccesoSensible(
                actor_cuenta_id=current_user.id,
                persona_afectada_id=afectado_id,
                recurso_accedido_id=self.recurso,
                ip_address=request.client.host if request.client else "127.0.0.1",
                detalle=f"Capa Legal: Auditoría Forzada en Ruta. Accion Validada"
            )
            db.add(audit)
            db.commit()
