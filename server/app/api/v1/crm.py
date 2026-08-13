from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from sqlalchemy import text
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.database import get_session
from app.models.crm import Cotizacion, CotizacionItem, EstadoCotizacion, OrigenCotizacion, TipoDespacho
from app.models.iam import Persona, TipoPersona, Direccion, CuentaAcceso
from app.api.deps import get_current_user, RequirePermiso

router = APIRouter()

class PersonaCreate(BaseModel):
    rut: str
    nombres: str
    apellidos: str
    email_personal: Optional[str] = None
    telefono: Optional[str] = None
    tipo_persona: TipoPersona = TipoPersona.CLIENTE
    transporte_preferido: Optional[str] = None
    direccion: Optional[str] = None
    comuna_id: Optional[int] = None

class PersonaRead(BaseModel):
    id: str
    rut: Optional[str] = None
    nombres: str
    apellidos: str
    email_personal: Optional[str] = None
    telefono: Optional[str] = None
    tipo_persona: TipoPersona
    estado: str
    transporte_preferido: Optional[str] = None
    direccion: Optional[str] = None
    comuna_id: Optional[int] = None
    comuna_nombre: Optional[str] = None
    region_id: Optional[int] = None
    region_nombre: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

def _get_persona_read(persona: Persona) -> PersonaRead:
    p_dict = persona.dict()
    if persona.direcciones and len(persona.direcciones) > 0:
        dir_obj = persona.direcciones[0]
        p_dict["direccion"] = dir_obj.calle_y_numero
        p_dict["comuna_id"] = dir_obj.comuna_id
        if dir_obj.comuna:
            p_dict["comuna_nombre"] = dir_obj.comuna.nombre
            p_dict["region_id"] = dir_obj.comuna.region_id
            if dir_obj.comuna.region:
                p_dict["region_nombre"] = dir_obj.comuna.region.nombre
    return PersonaRead(**p_dict)

class CotizacionItemRead(BaseModel):
    id: str
    sku_id: Optional[int] = None
    cantidad: int
    precio_unitario_estimado: float
    sku_name: Optional[str] = None
    sku_code: Optional[str] = None
    sku_image: Optional[str] = None

class CotizacionRead(BaseModel):
    id: str
    numero: Optional[int] = None
    persona_id: str
    origen: OrigenCotizacion
    estado: EstadoCotizacion
    mensaje: Optional[str] = None
    tipo_grupo: Optional[str] = None
    cantidad_aprox: Optional[int] = None
    fecha_evento: Optional[str] = None
    transporte: Optional[str] = None
    tipo_despacho: Optional[TipoDespacho] = None
    region: Optional[str] = None
    comuna: Optional[str] = None
    direccion: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    cliente: Optional[PersonaRead] = None
    items: List[CotizacionItemRead] = []

    class Config:
        from_attributes = True

def _get_cotizacion_read(c: Cotizacion) -> CotizacionRead:
    c_dict = c.dict()
    if c.persona:
        c_dict["cliente"] = _get_persona_read(c.persona)
    items_list = []
    if c.items:
        for it in c.items:
            it_dict = it.dict()
            if it.sku and it.sku.product:
                variant_str = ""
                if isinstance(it.sku.config, dict) and len(it.sku.config) > 0:
                    # Ignorar claves vacías o redundantes
                    vals = [f"{v}" for k, v in it.sku.config.items() if v]
                    if vals:
                        variant_str = " - " + " / ".join(vals)
                elif it.sku.sku:
                    variant_str = f" ({it.sku.sku})"
                
                it_dict["sku_name"] = it.nombre_custom or f"{it.sku.product.name}{variant_str}".strip()
                it_dict["sku_code"] = it.sku.sku
                it_dict["sku_image"] = it.sku.product.featured_image
            else:
                it_dict["sku_name"] = it.nombre_custom or "Producto del Catálogo / Especial"
                it_dict["sku_code"] = "SKU-CUSTOM"
            items_list.append(CotizacionItemRead(**it_dict))
    c_dict["items"] = items_list
    return CotizacionRead(**c_dict)

class CotizacionItemCreate(BaseModel):
    sku_id: Optional[int] = None
    cantidad: int = 1
    precio_unitario_estimado: float = 0.0
    nombre_custom: Optional[str] = None

class CotizacionCreate(BaseModel):
    persona_id: Optional[str] = None
    rut: Optional[str] = None
    nombres: Optional[str] = ""
    apellidos: Optional[str] = ""
    email_personal: Optional[str] = None
    telefono: Optional[str] = None
    
    origen: OrigenCotizacion = OrigenCotizacion.CATALOGO
    mensaje: Optional[str] = None
    tipo_grupo: Optional[str] = None
    cantidad_aprox: Optional[int] = None
    fecha_evento: Optional[str] = None
    
    transporte: Optional[str] = None
    tipo_despacho: Optional[TipoDespacho] = None
    region: Optional[str] = None
    comuna: Optional[str] = None
    comuna_id: Optional[int] = None
    direccion: Optional[str] = None
    
    items: List[CotizacionItemCreate] = []

@router.post("/", response_model=CotizacionRead)
def crear_cotizacion(data: CotizacionCreate, session: Session = Depends(get_session)):
    # 1. Buscar o Crear Persona
    persona = None
    
    if data.persona_id:
        persona = session.get(Persona, data.persona_id)
        
    if not persona and data.rut:
        persona = session.exec(select(Persona).where(Persona.rut == data.rut)).first()
    
    if not persona and data.email_personal:
        persona = session.exec(select(Persona).where(Persona.email_personal == data.email_personal)).first()
        
    if not persona and data.telefono:
        persona = session.exec(select(Persona).where(Persona.telefono == data.telefono)).first()
        
    if not persona:
        nombres_final = data.nombres or "Cliente"
        apellidos_final = data.apellidos or ""
        persona = Persona(
            rut=data.rut,
            nombres=nombres_final,
            apellidos=apellidos_final,
            email_personal=data.email_personal,
            telefono=data.telefono,
            tipo_persona=TipoPersona.CLIENTE if data.origen == OrigenCotizacion.MANUAL else TipoPersona.LEAD
        )
        session.add(persona)
        session.commit()
        session.refresh(persona)
    else:
        # Actualizar info si está vacía o el admin modificó algo
        update_needed = False
        if data.rut and not persona.rut:
            persona.rut = data.rut
            update_needed = True
        if data.email_personal and not persona.email_personal:
            persona.email_personal = data.email_personal
            update_needed = True
        if data.telefono and not persona.telefono:
            persona.telefono = data.telefono
            update_needed = True
        if data.nombres and persona.nombres == "Cliente":
            persona.nombres = data.nombres
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
    numero = session.execute(text("SELECT nextval('cotizaciones_numero_seq')")).scalar_one()
    cotizacion = Cotizacion(
        numero=numero,
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
            precio_unitario_estimado=item_data.precio_unitario_estimado,
            nombre_custom=item_data.nombre_custom
        )
        session.add(item)
    
    session.commit()
    session.refresh(cotizacion)
    
    return _get_cotizacion_read(cotizacion)

@router.get("/", response_model=List[CotizacionRead])
def listar_cotizaciones(session: Session = Depends(get_session), skip: int = 0, limit: int = 100, current_admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))):
    cotizaciones = session.exec(select(Cotizacion).order_by(Cotizacion.created_at.desc()).offset(skip).limit(limit)).all()
    return [_get_cotizacion_read(c) for c in cotizaciones]

class EstadoUpdate(BaseModel):
    estado: EstadoCotizacion

@router.put("/cotizaciones/{cotizacion_id}/estado", response_model=CotizacionRead)
def actualizar_estado_cotizacion(cotizacion_id: str, data: EstadoUpdate, session: Session = Depends(get_session), current_admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))):
    cotizacion = session.get(Cotizacion, cotizacion_id)
    if not cotizacion:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    
    cotizacion.estado = data.estado
    session.add(cotizacion)
    session.commit()
    session.refresh(cotizacion)
    return _get_cotizacion_read(cotizacion)

@router.get("/clientes", response_model=List[PersonaRead])
def listar_clientes(session: Session = Depends(get_session), skip: int = 0, limit: int = 100, current_admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))):
    # Se consideran leads/clientes
    clientes = session.exec(select(Persona).where(Persona.tipo_persona.in_([TipoPersona.LEAD, TipoPersona.CLIENTE])).offset(skip).limit(limit)).all()
    return [_get_persona_read(c) for c in clientes]

@router.post("/clientes", response_model=PersonaRead)
def crear_cliente(data: PersonaCreate, session: Session = Depends(get_session), current_admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))):
    # Verificar si ya existe por RUT
    if data.rut:
        persona_existente = session.exec(select(Persona).where(Persona.rut == data.rut)).first()
        if persona_existente:
            raise HTTPException(status_code=400, detail="Ya existe un registro con este RUT")
        
    nueva_persona = Persona(
        rut=data.rut,
        nombres=data.nombres,
        apellidos=data.apellidos,
        email_personal=data.email_personal,
        telefono=data.telefono,
        tipo_persona=data.tipo_persona,
        transporte_preferido=data.transporte_preferido
    )
    session.add(nueva_persona)
    session.commit()
    session.refresh(nueva_persona)
    
    if data.direccion and data.comuna_id:
        nueva_direccion = Direccion(
            persona_id=nueva_persona.id,
            comuna_id=data.comuna_id,
            calle_y_numero=data.direccion
        )
        session.add(nueva_direccion)
        session.commit()
        session.refresh(nueva_persona)
        
    return _get_persona_read(nueva_persona)

@router.put("/clientes/{cliente_id}", response_model=PersonaRead)
def actualizar_cliente(cliente_id: str, data: PersonaCreate, session: Session = Depends(get_session), current_admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))):
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
    persona.transporte_preferido = data.transporte_preferido
    
    session.add(persona)
    
    # Manejar direccion
    if data.direccion and data.comuna_id:
        if persona.direcciones and len(persona.direcciones) > 0:
            dir_act = persona.direcciones[0]
            dir_act.calle_y_numero = data.direccion
            dir_act.comuna_id = data.comuna_id
            session.add(dir_act)
        else:
            nueva_direccion = Direccion(
                persona_id=persona.id,
                comuna_id=data.comuna_id,
                calle_y_numero=data.direccion
            )
            session.add(nueva_direccion)
            
    session.commit()
    session.refresh(persona)
    return _get_persona_read(persona)
