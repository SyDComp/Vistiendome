from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlmodel import Session, select
from pydantic import BaseModel
import pyotp

from ...database import get_session
from ...models.iam import CuentaAcceso, Persona, EstadoCuenta, Permiso, UsuarioPermisosDirectos
from ...core import security

router = APIRouter()

class BootstrapSchema(BaseModel):
    rut: str
    nombres: str
    apellidos: str
    email_personal: str
    email_corporativo: str
    password: str

@router.post("/bootstrap/first-admin")
def bootstrap_system(data: BootstrapSchema, db: Session = Depends(get_session)):
    """
    Zero-Trust Endpoint para inicialización (Seed del Primer Súper Administrador).
    Bloquea accesos si ya existe una cuenta de sistema registrada post-instalación.
    """
    if db.exec(select(CuentaAcceso)).first():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Bloqueo de seguridad: El sistema ya ha sido inicializado."
        )
    
    # 1. Crear Entidad Inmutable
    persona = Persona(
        rut=data.rut, 
        nombres=data.nombres, 
        apellidos=data.apellidos, 
        email_personal=data.email_personal
    )
    db.add(persona)
    
    # 2. Vincular Autenticación
    estado_activo = db.exec(select(EstadoCuenta).where(EstadoCuenta.nombre == "ACTIVO")).first()
    if not estado_activo:
         raise HTTPException(
             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
             detail="Error Crítico: Faltan datos maestros. Ejecute seed_master.py primero."
         )
         
    cuenta = CuentaAcceso(
        persona=persona,
        email_corporativo=data.email_corporativo,
        password_hash=security.get_password_hash(data.password),
        estado_id=estado_activo.id
    )
    db.add(cuenta)
    
    # 3. Asignación God-Mode vía PBAC (Solo para la instalación)
    permisos = db.exec(select(Permiso)).all()
    for p in permisos:
        db.add(UsuarioPermisosDirectos(cuenta=cuenta, permiso=p))
        
    db.commit()
    return {"msg": "Primer Administrador aprovisionado correctamente. SuperUser mode activo y bloqueado para externos."}

class RegisterClientSchema(BaseModel):
    rut: str
    nombres: str
    apellidos: str
    email: str
    password: str

@router.post("/register")
def register_client(data: RegisterClientSchema, db: Session = Depends(get_session)):
    """
    Registro Público para Clientes. No otorga permisos IAM del backend.
    Enlaza el perfil de cliente nativamente al E-commerce.
    """
    existente = db.exec(select(CuentaAcceso).where(CuentaAcceso.email_corporativo == data.email)).first()
    if existente:
        raise HTTPException(status_code=400, detail="Este correo ya está registrado en la base de datos.")
        
    estado_activo = db.exec(select(EstadoCuenta).where(EstadoCuenta.nombre == "ACTIVO")).first()

    # 1. Crear Persona y Cuenta
    persona = Persona(rut=data.rut, nombres=data.nombres, apellidos=data.apellidos, email_personal=data.email)
    cuenta = CuentaAcceso(
        persona=persona, 
        email_corporativo=data.email, # Para clientes usamos su personal como principal
        password_hash=security.get_password_hash(data.password),
        estado_id=estado_activo.id
    )
    db.add(persona)
    db.add(cuenta)
    
    # 2. Asignar Perfil de Cliente de E-commerce (Sin Permisos Admin)
    from ...models.iam import PerfilCliente
    perfil = PerfilCliente(persona=persona, tipo_perfil="ESTANDAR")
    db.add(perfil)
    
    db.commit()
    return {"msg": "Cliente registrado exitosamente."}

class LoginMfaSchema(BaseModel):

    email: str
    password: str
    totp_code: str | None = None

@router.post("/login")
def basic_login(data: LoginMfaSchema, response: Response, db: Session = Depends(get_session)):
    """
    Login simplificado para el Administrador (MVP).
    Retorna JWT directamente si las credenciales son válidas y lo establece en una cookie segura.
    """
    cuenta = db.exec(select(CuentaAcceso).where(CuentaAcceso.email_corporativo == data.email)).first()
    
    if not cuenta or not security.verify_password(data.password, cuenta.password_hash):
        if cuenta:
            cuenta.intentos_fallidos += 1
            db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Credenciales inválidas"
        )
        
    if cuenta.estado.nombre != "ACTIVO":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Cuenta en estado '{cuenta.estado.nombre}'")

    # Reset intentos fallidos y confirmar acceso
    cuenta.intentos_fallidos = 0
    db.commit()

    token = security.create_access_token(subject=cuenta.id)
    
    # Establecer Cookie HttpOnly para mayor seguridad
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=1440 * 60, # 24 horas
        expires=1440 * 60,
        samesite="lax",
        secure=False, # Cambiar a True en producción con HTTPS
    )

    return {"access_token": token, "token_type": "bearer"}
