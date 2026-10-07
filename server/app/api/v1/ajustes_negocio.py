"""Ajustes del negocio. Solo con sesión del panel: no se publican al sitio."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session

from app.api.deps import RequirePermiso
from app.core import ajustes_negocio
from app.database import get_session

router = APIRouter(dependencies=[Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))])


class AjusteEntrada(BaseModel):
    valor: Any


@router.get("")
def leer_ajustes(db: Session = Depends(get_session)):
    return ajustes_negocio.leer_todos(db)


@router.put("/{clave}")
def guardar_ajuste(clave: str, data: AjusteEntrada, db: Session = Depends(get_session)):
    if clave not in ajustes_negocio.AJUSTES:
        raise HTTPException(status_code=404, detail="Ese ajuste no existe.")
    try:
        return {"valor": ajustes_negocio.guardar(db, clave, data.valor)}
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error))
