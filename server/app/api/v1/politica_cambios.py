"""
La política de cambios, para el sitio: pública, a diferencia del resto de los
Ajustes del negocio. Solo esta parte se publica (ver core/politica_cambios.py).
"""

from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.core import ajustes_negocio
from app.core.politica_cambios import texto_plazo
from app.database import get_session

router = APIRouter()


@router.get("")
def politica(db: Session = Depends(get_session)):
    """{plazo, unidad, personalizadas_sin_cambio, texto_plazo}."""
    p = ajustes_negocio.leer(db, ajustes_negocio.POLITICA_CAMBIOS)
    return {**p, "texto_plazo": texto_plazo(p)}
