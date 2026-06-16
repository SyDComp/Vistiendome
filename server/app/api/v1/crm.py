from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional
from pydantic import BaseModel

from app.database import get_session
from app.models.crm import Cotizacion, CotizacionItem, EstadoCotizacion, OrigenCotizacion, TipoDespacho, TipoTransporte
from app.models.iam import Persona, TipoPersona, Direccion
from app.api.deps import get_current_user

router = APIRouter()

class PersonaCreate(BaseModel):
    rut: str
    nombres: str
    apellidos: str
    email_personal: Optional[str] = None
    telefono: Optional[str] = None
    tipo_persona: TipoPersona = TipoPersona.CLIENTE

class CotizacionItemCreate(BaseModel):
    sku_id: Optional[int] = None
    cantidad: int = 1
    precio_unitario_estimado: float = 0.0

class CotizacionCreate(BaseModel):
    rut: Optional[str] = None
    nombres: str
    apellidos: str
    email_personal: Optional[str] = None
    telefono: Optional[str] = None
    
    origen: OrigenCotizacion = OrigenCotizacion.CATALOGO
    mensaje: Optional[str] = None
    tipo_grupo: Optional[str] = None
    cantidad_aprox: Optional[int] = None
    fecha_evento: Optional[str] = None
    
    transporte: Optional[TipoTransporte] = None
    tipo_despacho: Optional[TipoDespacho] = None
    region: Optional[str] = None
    comuna: Optional[str] = None
    comuna_id: Optional[int] = None
    direccion: Optional[str] = None
    
    items: List[CotizacionItemCreate] = []

@router.post("/", response_model=Cotizacion)
def crear_cotizacion(data: CotizacionCreate, session: Session = Depends(get_session)):
    # 1. Buscar o Crear Persona
    persona = None
    
    if data.rut:
        persona = session.exec(select(Persona).where(Persona.rut == data.rut)).first()
    
    if not persona and data.email_personal:
        persona = session.exec(select(Persona).where(Persona.email_personal == data.email_personal)).first()
        
    if not persona and data.telefono:
        persona = session.exec(select(Persona).where(Persona.telefono == data.telefono)).first()
        
    if not persona:
        persona = Persona(
            rut=data.rut,
            nombres=data.nombres,
            apellidos=data.apellidos,
            email_personal=data.email_personal,
            telefono=data.telefono,
            tipo_persona=TipoPersona.LEAD
        )
        session.add(persona)
        session.commit()
        session.refresh(persona)
    else:
        # Actualizar info si está vacía
        update_needed = False
        if not persona.rut and data.rut:
            persona.rut = data.rut
            update_needed = True
        if not persona.email_personal and data.email_personal:
            persona.email_personal = data.email_personal
            update_needed = True
        if not persona.telefono and data.telefono:
            persona.telefono = data.telefono
            update_needed = True
            
        if update_needed:
            session.add(persona)
            session.commit()
            session.refresh(persona)
            
    # 1.5 Crear o Buscar Direccion si viene en el payload
    if data.comuna_id and data.direccion:
        direccion_existente = session.exec(
            select(Direccion).where(
                Direccion.persona_id == persona.id,
                Direccion.comuna_id == data.comuna_id,
                Direccion.calle_y_numero == data.direccion
            )
        ).first()
        
        if not direccion_existente:
            nueva_direccion = Direccion(
                persona_id=persona.id,
                comuna_id=data.comuna_id,
                calle_y_numero=data.direccion
            )
            session.add(nueva_direccion)
            session.commit()
            
    # 2. Crear Cotizacion
    cotizacion = Cotizacion(
        persona_id=persona.id,
        origen=data.origen,
        mensaje=data.mensaje,
        tipo_grupo=data.tipo_grupo,
        cantidad_aprox=data.cantidad_aprox,
        fecha_evento=data.fecha_evento,
        transporte=data.transporte,
        tipo_despacho=data.tipo_despacho,
        region=data.region,
        comuna=data.comuna,
        direccion=data.direccion,
        estado=EstadoCotizacion.NUEVA
    )
    session.add(cotizacion)
    session.commit()
    session.refresh(cotizacion)
    
    # 3. Crear Items
    for item_data in data.items:
        item = CotizacionItem(
            cotizacion_id=cotizacion.id,
            sku_id=item_data.sku_id,
            cantidad=item_data.cantidad,
            precio_unitario_estimado=item_data.precio_unitario_estimado
        )
        session.add(item)
    
    session.commit()
    session.refresh(cotizacion)
    
    return cotizacion

@router.get("/", response_model=List[Cotizacion])
def listar_cotizaciones(session: Session = Depends(get_session), skip: int = 0, limit: int = 100):
    cotizaciones = session.exec(select(Cotizacion).offset(skip).limit(limit)).all()
    return cotizaciones

class EstadoUpdate(BaseModel):
    estado: EstadoCotizacion

@router.put("/cotizaciones/{cotizacion_id}/estado", response_model=Cotizacion)
def actualizar_estado_cotizacion(cotizacion_id: str, data: EstadoUpdate, session: Session = Depends(get_session)):
    cotizacion = session.get(Cotizacion, cotizacion_id)
    if not cotizacion:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    
    cotizacion.estado = data.estado
    session.add(cotizacion)
    session.commit()
    session.refresh(cotizacion)
    return cotizacion

@router.get("/clientes", response_model=List[Persona])
def listar_clientes(session: Session = Depends(get_session), skip: int = 0, limit: int = 100):
    # Se consideran leads/clientes
    clientes = session.exec(select(Persona).where(Persona.tipo_persona.in_([TipoPersona.LEAD, TipoPersona.CLIENTE])).offset(skip).limit(limit)).all()
    return clientes

@router.post("/clientes", response_model=Persona)
def crear_cliente(data: PersonaCreate, session: Session = Depends(get_session)):
    # Verificar si ya existe por RUT
    persona_existente = session.exec(select(Persona).where(Persona.rut == data.rut)).first()
    if persona_existente:
        raise HTTPException(status_code=400, detail="Ya existe un registro con este RUT")
        
    nueva_persona = Persona(
        rut=data.rut,
        nombres=data.nombres,
        apellidos=data.apellidos,
        email_personal=data.email_personal,
        telefono=data.telefono,
        tipo_persona=data.tipo_persona
    )
    session.add(nueva_persona)
    session.commit()
    session.refresh(nueva_persona)
    return nueva_persona

@router.put("/clientes/{cliente_id}", response_model=Persona)
def actualizar_cliente(cliente_id: str, data: PersonaCreate, session: Session = Depends(get_session)):
    persona = session.get(Persona, cliente_id)
    if not persona:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
        
    # Verificar si ya existe otro registro con este RUT
    if data.rut and data.rut != persona.rut:
        rut_existente = session.exec(select(Persona).where(Persona.rut == data.rut)).first()
        if rut_existente:
            raise HTTPException(status_code=400, detail="Ya existe otro registro con este RUT")
            
    persona.rut = data.rut
    persona.nombres = data.nombres
    persona.apellidos = data.apellidos
    persona.email_personal = data.email_personal
    persona.telefono = data.telefono
    persona.tipo_persona = data.tipo_persona
    
    session.add(persona)
    session.commit()
    session.refresh(persona)
    return persona
