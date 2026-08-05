from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from enum import Enum
from sqlmodel import SQLModel, Field, Relationship

try:
    from pydantic import field_validator
except ImportError:
    from pydantic import validator as field_validator

import ulid
from .geo import Comuna

def generate_ulid() -> str:
    return str(ulid.ULID())


class TipoPersona(str, Enum):
    LEAD = "LEAD"
    CLIENTE = "CLIENTE"
    EMPLEADO = "EMPLEADO"

class EstadoCuenta(SQLModel, table=True):
    __tablename__ = "estado_cuenta"
    id: str = Field(default_factory=generate_ulid, primary_key=True, max_length=26)
    nombre: str = Field(unique=True, max_length=50)
    descripcion: Optional[str] = Field(default=None)

    cuentas: List["CuentaAcceso"] = Relationship(back_populates="estado")


class Direccion(SQLModel, table=True):
    __tablename__ = "direcciones"
    id: str = Field(default_factory=generate_ulid, primary_key=True, max_length=26)
    persona_id: str = Field(foreign_key="personas.id", index=True, max_length=26)
    comuna_id: int = Field(foreign_key="comunas.id", index=True)
    
    calle_y_numero: str = Field(max_length=255)
    referencia: Optional[str] = Field(default=None, max_length=255)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    persona: "Persona" = Relationship(back_populates="direcciones")
    comuna: Optional[Comuna] = Relationship(back_populates="direcciones")


class Persona(SQLModel, table=True):
    __tablename__ = "personas"
    id: str = Field(default_factory=generate_ulid, primary_key=True, max_length=26)
    rut: str = Field(unique=True, index=True, max_length=12)
    nombres: str = Field(max_length=100)
    apellidos: str = Field(max_length=100)
    email_personal: Optional[str] = Field(default=None, max_length=255)
    telefono: Optional[str] = Field(default=None, max_length=20)
    tipo_persona: TipoPersona = Field(default=TipoPersona.LEAD)
    estado: str = Field(default="ACTIVO", max_length=50)
    transporte_preferido: Optional[str] = Field(default=None, max_length=50)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    cuenta_acceso: Optional["CuentaAcceso"] = Relationship(back_populates="persona", sa_relationship_kwargs={"uselist": False})
    perfil_cliente: Optional["PerfilCliente"] = Relationship(back_populates="persona", sa_relationship_kwargs={"uselist": False})
    
    cotizaciones: List["Cotizacion"] = Relationship(back_populates="persona")
    direcciones: List["Direccion"] = Relationship(back_populates="persona")

    def anonimizar(self):
        """Ley 19.628: Anonimización irreversible PII (Identificadores de Información Personal)"""
        self.nombres = "ANONIMIZADO"
        self.apellidos = "ANONIMIZADO"
        self.email_personal = None
        self.telefono = None
        self.estado = "ANONIMIZADO"


class PerfilCliente(SQLModel, table=True):
    __tablename__ = "perfiles_cliente"
    id: str = Field(default_factory=generate_ulid, primary_key=True, max_length=26)
    persona_id: str = Field(foreign_key="personas.id", unique=True, max_length=26)
    tipo_perfil: str = Field(max_length=50)
    descuento_porcentaje: Decimal = Field(default=Decimal("0.00"), max_digits=5, decimal_places=2)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    persona: Persona = Relationship(back_populates="perfil_cliente")


class CuentaAcceso(SQLModel, table=True):
    __tablename__ = "cuentas_acceso"
    id: str = Field(default_factory=generate_ulid, primary_key=True, max_length=26)
    persona_id: str = Field(foreign_key="personas.id", unique=True, max_length=26)
    email_corporativo: str = Field(unique=True, index=True, max_length=255)
    apodo: Optional[str] = Field(default=None, unique=True, index=True, max_length=50)
    password_hash: str = Field(max_length=255)
    estado_id: str = Field(foreign_key="estado_cuenta.id", max_length=26)
    intentos_fallidos: int = Field(default=0)
    mfa_secret: Optional[str] = Field(default=None, max_length=255)
    ultimo_acceso: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    persona: Persona = Relationship(back_populates="cuenta_acceso")
    estado: EstadoCuenta = Relationship(back_populates="cuentas")
    permisos_directos: List["UsuarioPermisosDirectos"] = Relationship(back_populates="cuenta")


class Permiso(SQLModel, table=True):
    __tablename__ = "permisos"
    id: str = Field(default_factory=generate_ulid, primary_key=True, max_length=26)
    recurso: str = Field(max_length=100)
    accion: str = Field(max_length=100)
    descripcion: Optional[str] = Field(default=None)

    cuentas_asignadas: List["UsuarioPermisosDirectos"] = Relationship(back_populates="permiso")
    politicas: List["PoliticaAcceso"] = Relationship(back_populates="permiso")


class PoliticaAcceso(SQLModel, table=True):
    """Refinamiento 2: Tabla Contextual Zero-Trust PBAC"""
    __tablename__ = "politicas_acceso"
    id: str = Field(default_factory=generate_ulid, primary_key=True, max_length=26)
    permiso_id: str = Field(foreign_key="permisos.id", max_length=26)
    condicion: str = Field(max_length=100)
    valor: str = Field(max_length=255)

    permiso: Permiso = Relationship(back_populates="politicas")


class UsuarioPermisosDirectos(SQLModel, table=True):
    __tablename__ = "usuario_permisos_directos"
    cuenta_id: str = Field(foreign_key="cuentas_acceso.id", primary_key=True, max_length=26)
    permiso_id: str = Field(foreign_key="permisos.id", primary_key=True, max_length=26)
    fecha_inicio: datetime = Field(default_factory=datetime.utcnow)
    fecha_fin: Optional[datetime] = Field(default=None)

    cuenta: CuentaAcceso = Relationship(back_populates="permisos_directos")
    permiso: Permiso = Relationship(back_populates="cuentas_asignadas")



class AuditoriaAccesoSensible(SQLModel, table=True):
    __tablename__ = "auditoria_acceso_sensible"
    id: str = Field(default_factory=generate_ulid, primary_key=True, max_length=26)
    actor_cuenta_id: str = Field(max_length=26, index=True)
    persona_afectada_id: str = Field(max_length=26, index=True) # Refinamiento Auditoría
    recurso_accedido_id: str = Field(max_length=26, index=True)
    ip_address: str = Field(max_length=45)
    timestamp: datetime = Field(default_factory=datetime.utcnow, index=True)
    detalle: Optional[str] = Field(default=None)
