"""
Los pagos de un pedido: lo que la clienta pagó, cuándo, cómo y quién lo anotó.

Como la bodega, es un libro: un pago no se borra ni se edita. Si se anotó mal,
se ANULA con un motivo, y el error y la corrección quedan a la vista. Lo único
que cambia de una fila, una sola vez, es que se anuló.

El monto es un entero en pesos chilenos: no hay centavos, y un decimal
arrastrado de una cuenta sería un saldo de "$0,4" que nadie entiende.
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Column, DateTime, ForeignKey, String, event, inspect
from sqlmodel import Field, SQLModel
import ulid


def _ahora() -> datetime:
    return datetime.now(timezone.utc)


class TipoPago:
    """Texto y no ENUM de la base: agregar uno no pide migración."""
    PAGO = "PAGO"
    # Lo pagado de más que se le devolvió a la clienta.
    DEVOLUCION = "DEVOLUCION"
    # Lo pagado de más que quedó a favor de la clienta para otra compra (ver
    # core/pagos/a_favor.py).
    A_FAVOR = "A_FAVOR"


class Pago(SQLModel, table=True):
    __tablename__ = "pagos"

    id: str = Field(default_factory=lambda: str(ulid.ULID()), primary_key=True, max_length=26)
    cotizacion_id: Optional[str] = Field(
        default=None,
        sa_column=Column(String(26), ForeignKey("cotizaciones.id"), nullable=True, index=True),
    )
    tipo: str = Field(default=TipoPago.PAGO, max_length=12)
    monto: int
    # El medio tal como se eligió ("Transferencia"). Texto y no una referencia
    # a la lista de Ajustes: si mañana se quita una opción, los pagos viejos
    # siguen diciendo cómo se pagó.
    medio: str = Field(max_length=60)
    nota: Optional[str] = Field(default=None, max_length=300)

    registrado_por_id: Optional[str] = Field(default=None, max_length=26)
    registrado_por: Optional[str] = Field(default=None, max_length=120)
    registrado_en: datetime = Field(default_factory=_ahora, sa_column=Column(DateTime(timezone=True), nullable=False))

    anulado_en: Optional[datetime] = Field(default=None, sa_column=Column(DateTime(timezone=True), nullable=True))
    anulado_por: Optional[str] = Field(default=None, max_length=120)
    anulado_motivo: Optional[str] = Field(default=None, max_length=300)


_SE_ANULA = {"anulado_en", "anulado_por", "anulado_motivo"}


@event.listens_for(Pago, "before_update")
def _solo_se_anula(mapper, connection, target):
    """Lo único que cambia de un pago es que se anula, y una sola vez."""
    estado = inspect(target)
    cambiados = {a.key for a in mapper.column_attrs if estado.attrs[a.key].history.has_changes()}
    if cambiados - _SE_ANULA:
        raise ValueError("Un pago no se edita: si se anotó mal, se anula y se registra de nuevo.")
    if estado.attrs["anulado_en"].history.deleted and estado.attrs["anulado_en"].history.deleted[0] is not None:
        raise ValueError("Este pago ya estaba anulado.")


@event.listens_for(Pago, "before_delete")
def _no_se_borra(mapper, connection, target):
    raise ValueError("Un pago no se borra: se anula, con un motivo.")
