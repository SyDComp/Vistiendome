"""
La historia de un pedido: qué le pasó, cuándo y quién lo hizo.

Cada anotación se escribe en la misma operación que el cambio que describe,
así que no puede existir uno sin el otro. Y no se edita ni se borra: si algo
se deshace, se anota que se deshizo. La regla vive acá, en el modelo, para que
ningún código la pueda saltar por descuido.

Se guarda el tipo y los datos, no una frase ya armada: el panel arma la frase,
y el informe de ventas o la caja pueden leer los datos sin interpretar texto.
"""

from datetime import datetime, timezone
from typing import Any, Dict, Optional

import ulid
from sqlalchemy import JSON, Column, DateTime, ForeignKey, String, event
from sqlmodel import Field, SQLModel


def _ahora() -> datetime:
    return datetime.now(timezone.utc)


class TipoEvento:
    """Los tipos de anotación. Texto y no enum de la base: agregar uno no pide migración."""

    CREADO = "CREADO"                        # {origen, canal}
    ESTADO = "ESTADO"                        # {de, a, motivo?}
    CANAL = "CANAL"                          # {de, a}
    ORDEN_AGREGADA = "ORDEN_AGREGADA"        # {orden, prendas}
    ORDEN_ESTADO = "ORDEN_ESTADO"            # {orden, de, a, prendas}
    ORDEN_ELIMINADA = "ORDEN_ELIMINADA"      # {orden, prendas}
    ELIMINADO = "ELIMINADO"                  # {}
    # Los pedidos anteriores a la historia: la foto de cómo estaban al empezar
    # a anotar. {estado, piezas, cortadas, ordenes}
    REGISTRO_INICIADO = "REGISTRO_INICIADO"


class PedidoEvento(SQLModel, table=True):
    __tablename__ = "pedido_eventos"

    id: str = Field(default_factory=lambda: str(ulid.ULID()), primary_key=True, max_length=26)

    # Si el pedido se borra, su historia queda: el id pasa a nulo y el número
    # sigue diciendo de qué pedido era.
    cotizacion_id: Optional[str] = Field(
        default=None,
        sa_column=Column(String(26), ForeignKey("cotizaciones.id", ondelete="SET NULL"), index=True),
    )
    numero_pedido: Optional[int] = Field(default=None, index=True)

    tipo: str = Field(max_length=40)
    datos: Dict[str, Any] = Field(default_factory=dict, sa_type=JSON)

    # La cuenta y su nombre en ese momento. Sin cuenta es el sitio web, o un
    # pedido anterior a la historia del que no quedó registrado quién lo cargó.
    actor_cuenta_id: Optional[str] = Field(default=None, max_length=26)
    actor_nombre: Optional[str] = Field(default=None, max_length=120)

    ocurrido_at: datetime = Field(
        default_factory=_ahora,
        sa_column=Column(DateTime(timezone=True), nullable=False, index=True),
    )


@event.listens_for(PedidoEvento, "before_update")
def _no_se_edita(mapper, connection, target):
    raise ValueError("La historia del pedido no se edita: se anota lo nuevo.")


@event.listens_for(PedidoEvento, "before_delete")
def _no_se_borra(mapper, connection, target):
    raise ValueError("La historia del pedido no se borra.")
