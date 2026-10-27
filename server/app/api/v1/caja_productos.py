"""
El catálogo de la caja, filtrado y paginado en el servidor: con cientos de
productos, la caja no descarga todo. La regla vive en core/caja/.

Los filtros llegan igual en las tres rutas:
  valor=COLOR=Negro      (uno por valor elegido; varios del mismo grupo: Negro o Azul)
  categoria=3            (incluye sus subcategorías)
  palabra=vestido        (lo que el buscador no reconoció como característica)
"""

from typing import List

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
    """Las variantes libres de un producto, para elegir característica por característica."""
    libres = caja.variantes_libres(db, producto_id)
    if not libres:
        raise HTTPException(status_code=404, detail="Ese producto no tiene nada libre para vender.")
    return [como_disponible(x) for x in libres]


@router.get("/buscar", response_model=Encontrado)
def buscar(valor: List[str] = Query([]), categoria: List[int] = Query([]), palabra: List[str] = Query([]),
           cuantos: int = Query(8, ge=1, le=50), db: Session = Depends(get_session)):
    """Lo que muestra el buscador mientras se escribe."""
    resultados, total = caja.buscar(db, _filtro(db, valor, categoria, palabra), cuantos)
    return Encontrado(resultados=[como_disponible(x) for x in resultados], total=total)
