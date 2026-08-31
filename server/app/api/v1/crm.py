from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from sqlalchemy import text
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, field_validator

from app.database import get_session
from app.models.crm import Cotizacion, CotizacionItem, EstadoCotizacion, OrigenCotizacion, TipoDespacho, ModoEntrega
from app.models.iam import Persona, TipoPersona, Direccion, CuentaAcceso
from app.models.catalog import StockMovement, MovementType
from app.models.taller import OrdenCorte, OrdenCorteItem, EstadoOrdenCorte
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
    # Producto y config crudos (no aplanados en sku_name), para armar la
    # planilla/orden de corte con columnas propias por característica.
    producto_nombre: Optional[str] = None
    config: dict = {}
    cortado: bool = False

class OrdenDeCorteDelPedido(BaseModel):
    """Lo justo para nombrarla y poder saltar a ella."""
    id: str
    numero: int
    estado: EstadoOrdenCorte


class ProduccionRead(BaseModel):
    """
    En qué va la confección de este pedido. **Todo derivado**, nada declarado.

    Por eso no existe un estado "en corte" en el pedido: el sistema ya sabe
    pieza por pieza si está cortada (lo pone la orden de corte al finalizar), y
    pedir que además alguien lo declare abre la puerta a que las dos versiones
    no coincidan.
    """
    piezas: int = 0          # ítems con variante real: sólo eso se puede cortar
    cortadas: int = 0
    ordenes: List[OrdenDeCorteDelPedido] = []


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
    modo_entrega: Optional[ModoEntrega] = None
    transporte: Optional[str] = None
    tipo_despacho: Optional[TipoDespacho] = None
    region: Optional[str] = None
    comuna: Optional[str] = None
    direccion: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    cliente: Optional[PersonaRead] = None
    items: List[CotizacionItemRead] = []
    produccion: ProduccionRead = ProduccionRead()

    class Config:
        from_attributes = True

def _get_item_read(it: CotizacionItem) -> CotizacionItemRead:
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
        # Product no tiene "featured_image" (bug preexistente: esto rompía en
        # 500 CUALQUIER cotización con un ítem de SKU real, incluida la lista
        # completa de GET /crm/). La imagen del producto vive en media_assets;
        # si el SKU tiene foto propia, es más precisa que la de portada.
        propia = it.sku.media_assets[0].url if it.sku.media_assets else None
        portada = it.sku.product.media_assets[0].url if it.sku.product.media_assets else None
        it_dict["sku_image"] = propia or portada
        it_dict["producto_nombre"] = it.sku.product.name
        it_dict["config"] = it.sku.config or {}
    else:
        it_dict["sku_name"] = it.nombre_custom or "Producto del Catálogo / Especial"
        it_dict["sku_code"] = "SKU-CUSTOM"
        it_dict["producto_nombre"] = it.nombre_custom or "Especial"
        it_dict["config"] = {}
    return CotizacionItemRead(**it_dict)

def _mapa_ordenes_de_corte(session: Session, cotizacion_ids: List[str]) -> dict:
    """
    `{cotizacion_id: [orden, ...]}` en UNA consulta.

    En un bucle por cotización serían N consultas; hoy son 14 pedidos y no se
    notaría, pero el listado crece con el negocio y esto no cuesta más escribirlo.
    Se excluyen las canceladas: una orden cancelada no dice nada de la pieza.
    """
    if not cotizacion_ids:
        return {}

    filas = session.exec(
        select(CotizacionItem.cotizacion_id, OrdenCorte)
        .join(OrdenCorteItem, OrdenCorteItem.cotizacion_item_id == CotizacionItem.id)
        .join(OrdenCorte, OrdenCorte.id == OrdenCorteItem.orden_id)
        .where(CotizacionItem.cotizacion_id.in_(cotizacion_ids))
        .where(OrdenCorte.estado != EstadoOrdenCorte.CANCELADA)
    ).all()

    mapa: dict = {}
    for cot_id, orden in filas:
        vistas = mapa.setdefault(cot_id, {})
        vistas[orden.id] = OrdenDeCorteDelPedido(
            id=orden.id, numero=orden.numero, estado=orden.estado
        )
    return {k: list(v.values()) for k, v in mapa.items()}


def _get_cotizacion_read(c: Cotizacion, ordenes: Optional[List[OrdenDeCorteDelPedido]] = None) -> CotizacionRead:
    c_dict = c.dict()
    if c.persona:
        c_dict["cliente"] = _get_persona_read(c.persona)
    items = list(c.items or [])
    c_dict["items"] = [_get_item_read(it) for it in items]
    # Sólo cuentan las piezas con variante real: un ítem escrito a mano no se
    # puede cortar, y sumarlo al total daría un "2 de 3" que nunca llega a 3.
    cortables = [it for it in items if it.sku_id]
    c_dict["produccion"] = ProduccionRead(
        piezas=len(cortables),
        cortadas=sum(1 for it in cortables if it.cortado),
        ordenes=ordenes or [],
    )
    return CotizacionRead(**c_dict)

class CotizacionItemCreate(BaseModel):
    sku_id: Optional[int] = None
    cantidad: int = 1
    precio_unitario_estimado: float = 0.0
    nombre_custom: Optional[str] = None

def _modo_de(data) -> ModoEntrega:
    """
    El modo que declara el pedido. Si no viene —clientes viejos que todavía no
    mandan el campo— se infiere del nombre del transporte, que es justo lo que
    NO queremos hacer: por eso la inferencia vive acá, en el borde, y no
    repartida por el sistema.

    "…(retiro en sucursal)" es un DESPACHO y se descarta primero, porque
    contiene la palabra "retiro" y si no se mirara antes caería del lado
    equivocado.
    """
    if getattr(data, "modo_entrega", None):
        return data.modo_entrega
    texto = (data.transporte or "").upper()
    if "SUCURSAL" in texto:
        return ModoEntrega.DESPACHO
    if texto in ("RETIRO_LOCAL", "RETIRO EN LOCAL", "RETIRO EN TIENDA", "RETIRO"):
        return ModoEntrega.RETIRO
    return ModoEntrega.DESPACHO


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
    
    # Retiro o despacho. Se acepta None por compatibilidad con lo que ya
    # existía; el servidor lo completa abajo.
    modo_entrega: Optional[ModoEntrega] = None
    transporte: Optional[str] = None
    tipo_despacho: Optional[TipoDespacho] = None
    region: Optional[str] = None
    comuna: Optional[str] = None
    comuna_id: Optional[int] = None

    @field_validator("comuna_id", mode="before")
    @classmethod
    def _comuna_vacia_es_nula(cls, v):
        """
        Un formulario que no llenó la comuna manda "", no null, y eso no parsea
        como entero: el pedido moría con 422.

        Pasaba en TODO pedido de retiro hecho desde la web —no hay comuna que
        elegir— y no se veía, porque el registro en CRM se dispara sin esperar
        respuesta. El resultado: la clienta mandaba su pedido por WhatsApp y el
        pedido nunca entraba al sistema.
        """
        return None if v in ("", None) else v
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
        modo_entrega=_modo_de(data),
        # Un retiro no tiene transportista ni destino: guardarlos sería dejar
        # datos que contradicen el modo.
        transporte=data.transporte if _modo_de(data) == ModoEntrega.DESPACHO else None,
        tipo_despacho=data.tipo_despacho if _modo_de(data) == ModoEntrega.DESPACHO else None,
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

@router.get("/conteo-estados")
def conteo_por_estado(session: Session = Depends(get_session), current_admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))):
    """
    Cuántos pedidos hay en cada estado. Una consulta, sin traer las filas.

    Existe para que una pantalla pueda decir "Por despachar (2)" sin cargar
    todos los pedidos sólo para contarlos.
    """
    filas = session.exec(
        select(Cotizacion.estado, func.count()).group_by(Cotizacion.estado)
    ).all()
    return {str(estado.value if hasattr(estado, "value") else estado): n for estado, n in filas}


@router.get("/", response_model=List[CotizacionRead])
def listar_cotizaciones(
    session: Session = Depends(get_session),
    skip: int = 0,
    limit: int = 100,
    estado: Optional[List[EstadoCotizacion]] = Query(default=None),
    current_admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR")),
):
    """
    `?estado=CONFIRMADA&estado=DESPACHADA` acota la lista en el servidor.

    Importa para pantallas como la de etiquetas: traer todo y filtrar en el
    navegador funciona con 14 pedidos y deja de funcionar en el 101, porque el
    `limit` corta antes de que el filtro llegue a mirar.
    """
    consulta = select(Cotizacion)
    if estado:
        consulta = consulta.where(Cotizacion.estado.in_(estado))
    cotizaciones = session.exec(
        consulta.order_by(Cotizacion.created_at.desc()).offset(skip).limit(limit)
    ).all()
    ordenes = _mapa_ordenes_de_corte(session, [c.id for c in cotizaciones])
    return [_get_cotizacion_read(c, ordenes.get(c.id, [])) for c in cotizaciones]

def _sincronizar_stock_venta(session: Session, cotizacion: Cotizacion, estado_anterior: EstadoCotizacion, estado_nuevo: EstadoCotizacion) -> None:
    """
    Al pasar a DESPACHADA descuenta el stock (un StockMovement SALE por ítem con
    SKU real); al salir de DESPACHADA lo revierte.

    En DESPACHADA y no antes: la prenda deja la bodega cuando sale del taller,
    no cuando la clienta acepta. Antes el gancho estaba en "aceptó", así que el
    stock bajaba semanas antes de que la prenda existiera siquiera.

    Idempotente vía reference_id=item.id: despachar, revertir y volver a
    despachar no descuenta dos veces, porque siempre revisa si el movimiento de
    ESE ítem ya existe antes de crearlo — y lo borra al revertir, así que el
    siguiente despacho lo vuelve a crear limpio.
    """
    entra_a_despacho = estado_nuevo == EstadoCotizacion.DESPACHADA and estado_anterior != EstadoCotizacion.DESPACHADA
    sale_de_despacho = estado_anterior == EstadoCotizacion.DESPACHADA and estado_nuevo != EstadoCotizacion.DESPACHADA

    if not entra_a_despacho and not sale_de_despacho:
        return

    for item in cotizacion.items:
        if not item.sku_id:
            continue
        existente = session.exec(
            select(StockMovement).where(
                StockMovement.sku_id == item.sku_id,
                StockMovement.type == MovementType.SALE,
                StockMovement.reference_id == item.id,
            )
        ).first()

        if entra_a_despacho and not existente:
            session.add(StockMovement(
                sku_id=item.sku_id,
                type=MovementType.SALE,
                quantity=-item.cantidad,
                reference_id=item.id,
                note=f"Despacho pedido #{cotizacion.numero}",
            ))
        elif sale_de_despacho and existente:
            session.delete(existente)

class EstadoUpdate(BaseModel):
    estado: EstadoCotizacion

@router.put("/cotizaciones/{cotizacion_id}/estado", response_model=CotizacionRead)
def actualizar_estado_cotizacion(cotizacion_id: str, data: EstadoUpdate, session: Session = Depends(get_session), current_admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))):
    cotizacion = session.get(Cotizacion, cotizacion_id)
    if not cotizacion:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")

    estado_anterior = cotizacion.estado
    cotizacion.estado = data.estado
    session.add(cotizacion)
    _sincronizar_stock_venta(session, cotizacion, estado_anterior, data.estado)
    session.commit()
    session.refresh(cotizacion)
    return _get_cotizacion_read(cotizacion, _mapa_ordenes_de_corte(session, [cotizacion.id]).get(cotizacion.id, []))

@router.get("/cotizaciones/{cotizacion_id}", response_model=CotizacionRead)
def obtener_cotizacion(cotizacion_id: str, session: Session = Depends(get_session), current_admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))):
    cotizacion = session.get(Cotizacion, cotizacion_id)
    if not cotizacion:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    return _get_cotizacion_read(cotizacion, _mapa_ordenes_de_corte(session, [cotizacion.id]).get(cotizacion.id, []))

# Acá vivían `PUT /items/{id}/cortado` y `GET /orden-corte`, del diseño anterior
# a que la orden de corte fuera una entidad propia (`app/models/taller.py`).
# Se borraron el 2026-08-31: nadie los llamaba — el cliente usa
# `/api/v1/ordenes-corte/*` — y dejarlos invitaba a creer que seguían en uso.

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
