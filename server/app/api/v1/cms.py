from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlmodel import Session, select
from ...database import get_session
from ...models.cms import HomepageSection, HelpSection
from ...models.catalog import MediaAsset
from pydantic import BaseModel
from ...core.sockets import manager
from ...api.deps import RequirePermiso
from ...models.iam import CuentaAcceso

router = APIRouter()


def _resolve_layer_media(node, db: Session):
    """Resuelve recursivamente la URL vigente de cualquier nodo con `asset_id`
    (ej. capas de imagen de los bloques hero). Robusto ante renombrados:
    la referencia se guarda por ID y la url se calcula al leer."""
    if isinstance(node, dict):
        resolved = {k: _resolve_layer_media(v, db) for k, v in node.items()}
        aid = resolved.get("asset_id")
        if aid:
            asset = db.get(MediaAsset, aid)
            if asset:
                resolved["url"] = asset.url
        return resolved
    if isinstance(node, list):
        return [_resolve_layer_media(x, db) for x in node]
    return node


def _serialize_section(s, db: Session):
    return {
        "id": s.id,
        "page": s.page,
        "type": s.type,
        "title": s.title,
        "config": _resolve_layer_media(s.config, db),
        "order": s.order,
        "is_active": s.is_active,
    }

# --- SCHEMAS ---

class HomepageSectionCreate(BaseModel):
    page: str = "homepage"
    type: str
    title: str
    config: Dict[str, Any] = {}
    order: int = 0
    is_active: bool = True

class HomepageSectionUpdate(BaseModel):
    page: Optional[str] = None
    type: Optional[str] = None
    title: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None

class HomepageReorderRequest(BaseModel):
    section_ids: List[int]

class HelpSectionCreate(BaseModel):
    slug: str
    title: str
    icon: str
    order: int = 0
    is_active: bool = True

class HelpSectionUpdate(BaseModel):
    slug: Optional[str] = None
    title: Optional[str] = None
    icon: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None

class HelpReorderRequest(BaseModel):
    section_ids: List[int]

# --- PUBLIC ENDPOINTS ---

@router.get("/")
def get_cms_public(page: str = "homepage", db: Session = Depends(get_session)):
    """Retorna las secciones activas ordenadas para una página específica."""
    statement = select(HomepageSection).where(
        HomepageSection.is_active == True,
        HomepageSection.page == page
    ).order_by(HomepageSection.order)
    return [_serialize_section(s, db) for s in db.exec(statement).all()]

@router.get("/help/sections", response_model=List[HelpSection])
def get_help_sections_public(db: Session = Depends(get_session)):
    """Retorna las secciones de ayuda activas."""
    statement = select(HelpSection).where(HelpSection.is_active == True).order_by(HelpSection.order)
    return db.exec(statement).all()

# --- ADMIN ENDPOINTS (CMS BLOCKS) ---

@router.get("/admin")
def get_cms_admin(page: str = "homepage", db: Session = Depends(get_session), current_admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))):
    """Retorna todas las secciones ordenadas para el panel de administración."""
    statement = select(HomepageSection).where(HomepageSection.page == page).order_by(HomepageSection.order)
    return [_serialize_section(s, db) for s in db.exec(statement).all()]

@router.post("/admin", response_model=HomepageSection)
async def create_section(section: HomepageSectionCreate, db: Session = Depends(get_session), current_admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))):
    """Crea una nueva sección."""
    db_section = HomepageSection.from_orm(section)
    db.add(db_section)
    db.commit()
    db.refresh(db_section)
    
    await manager.broadcast({
        "type": "invalidate_cache",
        "resource": "cms",
        "page": db_section.page,
        "action": "create"
    })
    return db_section

@router.patch("/admin/{section_id}", response_model=HomepageSection)
async def update_section(section_id: int, section: HomepageSectionUpdate, db: Session = Depends(get_session), current_admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))):
    """Actualiza una sección existente."""
    db_section = db.get(HomepageSection, section_id)
    if not db_section:
        raise HTTPException(status_code=404, detail="Sección no encontrada")
    
    section_data = section.dict(exclude_unset=True)
    for key, value in section_data.items():
        setattr(db_section, key, value)
    
    db.add(db_section)
    db.commit()
    db.refresh(db_section)
    
    await manager.broadcast({
        "type": "invalidate_cache",
        "resource": "cms",
        "page": db_section.page,
        "action": "update",
        "id": section_id
    })
    return db_section

@router.delete("/admin/{section_id}")
async def delete_section(section_id: int, db: Session = Depends(get_session), current_admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))):
    """Elimina una sección."""
    db_section = db.get(HomepageSection, section_id)
    if not db_section:
        raise HTTPException(status_code=404, detail="Sección no encontrada")
    
    page = db_section.page
    db.delete(db_section)
    db.commit()
    
    await manager.broadcast({
        "type": "invalidate_cache",
        "resource": "cms",
        "page": page,
        "action": "delete",
        "id": section_id
    })
    return {"ok": True}

@router.post("/admin/reorder")
async def reorder_sections(request: HomepageReorderRequest, db: Session = Depends(get_session), current_admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))):
    """Actualiza el orden de múltiples secciones."""
    page = "unknown"
    for index, section_id in enumerate(request.section_ids):
        db_section = db.get(HomepageSection, section_id)
        if db_section:
            db_section.order = index
            page = db_section.page
            db.add(db_section)
    db.commit()
    
    await manager.broadcast({
        "type": "invalidate_cache",
        "resource": "cms",
        "page": page,
        "action": "reorder"
    })
    return {"ok": True}

# --- ADMIN ENDPOINTS (HELP SECTIONS) ---

@router.get("/admin/help/sections", response_model=List[HelpSection])
def get_help_sections_admin(db: Session = Depends(get_session), current_admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))):
    """Retorna todas las secciones de ayuda."""
    statement = select(HelpSection).order_by(HelpSection.order)
    return db.exec(statement).all()

@router.post("/admin/help/sections", response_model=HelpSection)
async def create_help_section(section: HelpSectionCreate, db: Session = Depends(get_session), current_admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))):
    db_section = HelpSection.from_orm(section)
    db.add(db_section)
    db.commit()
    db.refresh(db_section)
    
    await manager.broadcast({"type": "invalidate_cache", "resource": "help_sections"})
    return db_section

@router.patch("/admin/help/sections/{section_id}", response_model=HelpSection)
async def update_help_section(section_id: int, section: HelpSectionUpdate, db: Session = Depends(get_session), current_admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))):
    db_section = db.get(HelpSection, section_id)
    if not db_section: raise HTTPException(status_code=404)
    
    data = section.dict(exclude_unset=True)
    for k, v in data.items(): setattr(db_section, k, v)
    
    db.add(db_section)
    db.commit()
    db.refresh(db_section)
    
    await manager.broadcast({"type": "invalidate_cache", "resource": "help_sections"})
    return db_section

@router.delete("/admin/help/sections/{section_id}")
async def delete_help_section(section_id: int, db: Session = Depends(get_session), current_admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))):
    db_section = db.get(HelpSection, section_id)
    if not db_section: raise HTTPException(status_code=404)
    db.delete(db_section)
    db.commit()
    await manager.broadcast({"type": "invalidate_cache", "resource": "help_sections"})
    return {"ok": True}

@router.post("/admin/help/sections/reorder")
async def reorder_help_sections(request: HelpReorderRequest, db: Session = Depends(get_session), current_admin: CuentaAcceso = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))):
    for index, s_id in enumerate(request.section_ids):
        db_s = db.get(HelpSection, s_id)
        if db_s:
            db_s.order = index
            db.add(db_s)
    db.commit()
    await manager.broadcast({"type": "invalidate_cache", "resource": "help_sections"})
    return {"ok": True}
