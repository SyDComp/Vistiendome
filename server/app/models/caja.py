"""
El arqueo de la caja de un día: con cuánto partió el cajón, cuánto se contó al
cerrar y cuánto se dejó para el día siguiente (core/caja/arqueo.py).

Lo cobrado no vive acá: sale del libro de pagos (core/caja/cierre.py). Esto es
lo único del cierre que no se puede calcular, porque lo cuenta una persona.
"""

from datetime import date, datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class ArqueoCaja(SQLModel, table=True):
    __tablename__ = "arqueos_caja"

    fecha: date = Field(primary_key=True)
    fondo_inicial: Optional[int] = Field(default=None)   # con cuánto partió el cajón
    # Quién, por su cuenta; el nombre queda como estaba ese día.
    abierto_por_id: Optional[str] = Field(default=None, max_length=26, foreign_key="cuentas_acceso.id")
    abierto_por: Optional[str] = Field(default=None, max_length=120)
    abierto_en: Optional[datetime] = Field(default=None)
    contado: Optional[int] = Field(default=None)         # lo que había al cerrar
    deja: Optional[int] = Field(default=None)            # lo que queda para mañana
    nota: Optional[str] = Field(default=None, max_length=500)
    cerrado_por_id: Optional[str] = Field(default=None, max_length=26, foreign_key="cuentas_acceso.id")
    cerrado_por: Optional[str] = Field(default=None, max_length=120)
    cerrado_en: Optional[datetime] = Field(default=None)
