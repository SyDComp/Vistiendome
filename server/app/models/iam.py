from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship

try:
    from pydantic import field_validator
except ImportError:
    from pydantic import validator as field_validator

import ulid

def generate_ulid() -> str:
    return ulid.new().str

# Funciones mock de cifrado (Vaulting Core Logic)
def encrypt_data(plain_text: str) -> str:
    """Implementación de Vaulting (Simulada). En producción utilizar bibliotecas de criptografía (ej: Fernet)."""
    if not plain_text or plain_text.startswith("vault:v1:"): 
        return plain_text
    return f"vault:v1:{plain_text[::-1]}" 

def decrypt_data(cipher_text: str) -> str:
    """Desencriptación Vaulting (Simulada)."""
    if not cipher_text or not cipher_text.startswith("vault:v1:"): 
        return cipher_text
    return cipher_text.replace("vault:v1:", "")[::-1]

class EstadoCuenta(SQLModel, table=True):
    __tablename__ = "estado_cuenta"
    id: str = Field(default_factory=generate_ulid, primary_key=True, max_length=26)
    nombre: str = Field(unique=True, max_length=50)
    descripcion: Optional[str] = Field(default=None)

    cuentas: List["CuentaAcceso"] = Relationship(back_populates="estado")


class Persona(SQLModel, table=True):
    __tablename__ = "personas"
    id: str = Field(default_factory=generate_ulid, primary_key=True, max_length=26)
    rut: str = Field(unique=True, index=True, max_length=12)
    nombres: str = Field(max_length=100)
    apellidos: str = Field(max_length=100)
    email_personal: Optional[str] = Field(default=None, max_length=255)
    telefono: Optional[str] = Field(default=None, max_length=20)
    estado: str = Field(default="ACTIVO", max_length=50)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    cuenta_acceso: Optional["CuentaAcceso"] = Relationship(back_populates="persona", sa_relationship_kwargs={"uselist": False})
    remuneraciones: List["HistorialRemuneraciones"] = Relationship(back_populates="persona")
    contratos: List["ContratosLegales"] = Relationship(back_populates="persona")
    datos_bancarios: Optional["DatosBancarios"] = Relationship(back_populates="persona", sa_relationship_kwargs={"uselist": False})
    perfil_cliente: Optional["PerfilCliente"] = Relationship(back_populates="persona", sa_relationship_kwargs={"uselist": False})

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


class HistorialRemuneraciones(SQLModel, table=True):
    __tablename__ = "historial_remuneraciones"
    id: str = Field(default_factory=generate_ulid, primary_key=True, max_length=26)
    persona_id: str = Field(foreign_key="personas.id", max_length=26)
    sueldo_base: Decimal = Field(max_digits=12, decimal_places=2)
    fecha_inicio: date
    fecha_fin: Optional[date] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    persona: Persona = Relationship(back_populates="remuneraciones")


class ContratosLegales(SQLModel, table=True):
    __tablename__ = "contratos_legales"
    id: str = Field(default_factory=generate_ulid, primary_key=True, max_length=26)
    persona_id: str = Field(foreign_key="personas.id", max_length=26)
    cargo: str = Field(max_length=150)
    hash_respaldo_pdf: str = Field(max_length=255)
    fecha_inicio: date
    fecha_fin: Optional[date] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    persona: Persona = Relationship(back_populates="contratos")


class DatosBancarios(SQLModel, table=True):
    __tablename__ = "datos_bancarios"
    id: str = Field(default_factory=generate_ulid, primary_key=True, max_length=26)
    persona_id: str = Field(foreign_key="personas.id", unique=True, max_length=26)
    banco: str = Field(max_length=100)
    tipo_cuenta: str = Field(max_length=50)
    numero_cuenta_vault: str = Field(max_length=255)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    persona: Persona = Relationship(back_populates="datos_bancarios")

    # Refinamiento 3: Cifrado explícito de datos bancarios (Vaulting)
    @field_validator("numero_cuenta_vault", mode="before")
    def encrypt_numero_cuenta(cls, v):
        if v and not v.startswith("vault:v1:"):
            return encrypt_data(str(v))
        return v
        
    @property
    def numero_cuenta_plano(self) -> str:
        """Helper para recuperar el valor desencriptado."""
        return decrypt_data(self.numero_cuenta_vault)


class AuditoriaAccesoSensible(SQLModel, table=True):
    __tablename__ = "auditoria_acceso_sensible"
    id: str = Field(default_factory=generate_ulid, primary_key=True, max_length=26)
    actor_cuenta_id: str = Field(max_length=26, index=True)
    persona_afectada_id: str = Field(max_length=26, index=True) # Refinamiento Auditoría
    recurso_accedido_id: str = Field(max_length=26, index=True)
    ip_address: str = Field(max_length=45)
    timestamp: datetime = Field(default_factory=datetime.utcnow, index=True)
    detalle: Optional[str] = Field(default=None)
