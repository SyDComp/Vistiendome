"""
El catálogo de la caja, filtrado y paginado en el servidor (con cientos de
productos, la caja no descarga todo), y el cierre de caja del día. La regla
vive en core/caja/.

Los filtros llegan igual en las tres rutas:
  valor=COLOR=Negro      (uno por valor elegido; varios del mismo grupo: Negro o Azul)
  categoria=3            (incluye sus subcategorías)
  palabra=vestido        (lo que el buscador no reconoció como característica)
"""

from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session

from app.api.deps import RequirePermiso
from app.api.v1.venta_local import Disponible, como_disponible
from app.core import caja
from app.core.categorias import descendientes
from app.database import get_session
from app.models.catalog import Category

router = APIRouter(dependencies=[Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))])


class ProductoCaja(BaseModel):
    id: int
    nombre: str
    imagen: str = ""
    imagen_srcset: str = ""   # derivadas webp: la tarjeta no baja el original
    libres: int               # de lo que cumple el filtro
    vendidos: int             # en los últimos 30 días


class PaginaCaja(BaseModel):
    productos: List[ProductoCaja]
    total: int
    pagina: int
    paginas: int
    piezas: List[Disponible]
    facetas: List[dict]


class Encontrado(BaseModel):
    resultados: List[Disponible]
    total: int
    productos: int     # de cuántos productos son las variantes (las tarjetas muestran productos)
    piezas: int


def _filtro(db: Session, valor: List[str], categoria: List[int], palabra: List[str]) -> caja.Filtro:
    ids = set()
    for cid in categoria:
        c = db.get(Category, cid)
        if c:
            ids |= {c.id} | {d.id for d in descendientes(c)}
    return caja.Filtro.desde(valor, ids, palabra)


@router.get("/catalogo", response_model=PaginaCaja)
def catalogo(valor: List[str] = Query([]), categoria: List[int] = Query([]), palabra: List[str] = Query([]),
             pagina: int = Query(1, ge=1), db: Session = Depends(get_session)):
    """Una página de productos (10: las teclas 1 a 9 y 0), las piezas únicas y los filtros con sus cuentas."""
    p = caja.pagina(db, _filtro(db, valor, categoria, palabra), pagina)
    return PaginaCaja(productos=p.productos, total=p.total, pagina=p.pagina, paginas=p.paginas,
                      piezas=[como_disponible(x) for x in p.piezas], facetas=p.facetas)


@router.get("/productos/{producto_id}/variantes", response_model=List[Disponible])
def variantes(producto_id: int, db: Session = Depends(get_session)):
    """
    Las variantes de un producto, con su disponible, para elegir característica
    por característica: las que no tienen salen apagadas ("no queda").
    """
    todas = caja.variantes_del_catalogo(db, producto_id)
    if not todas:
        raise HTTPException(status_code=404, detail="Ese producto no tiene variantes.")
    return [como_disponible(x) for x in todas]


@router.get("/buscar", response_model=Encontrado)
def buscar(valor: List[str] = Query([]), categoria: List[int] = Query([]), palabra: List[str] = Query([]),
           cuantos: int = Query(8, ge=1, le=50), db: Session = Depends(get_session)):
    """Lo que muestra el buscador mientras se escribe."""
    e = caja.buscar(db, _filtro(db, valor, categoria, palabra), cuantos)
    return Encontrado(resultados=[como_disponible(x) for x in e.resultados], total=e.total,
                      productos=e.productos, piezas=e.piezas)


class MedioCierre(BaseModel):
    medio: str
    cobrado: int
    devuelto: int
    neto: int
    pagos: int


class CierreCaja(BaseModel):
    fecha: date
    por_medio: List[MedioCierre]
    total_neto: int
    efectivo_en_cajon: Optional[int]   # None si no hay un medio "Efectivo"
    con_saldo_a_favor: int
    ventas_caja: List[dict]
    anulados_despues: List[dict]


@router.get("/cierre", response_model=CierreCaja)
def cierre(fecha: Optional[date] = None, db: Session = Depends(get_session)):
    """El cierre de caja de un día (hoy, si no se dice): se calcula del libro de pagos (core/caja/cierre.py)."""
    c = caja.cierre(db, fecha or caja.hoy())
    return CierreCaja(
        fecha=c.fecha, total_neto=c.total_neto, efectivo_en_cajon=c.efectivo_en_cajon,
        con_saldo_a_favor=c.con_saldo_a_favor,
        por_medio=[MedioCierre(medio=m.medio, cobrado=m.cobrado, devuelto=m.devuelto, neto=m.neto, pagos=m.pagos)
                   for m in c.por_medio],
        ventas_caja=[vars(v) for v in c.ventas_caja],
        anulados_despues=[vars(a) for a in c.anulados_despues],
    )
