"""Un pedido puede no tener clienta: la venta en el local sin datos

Revision ID: f5c7e1a3d982
Revises: e4b6d0f2c871
Create Date: 2026-10-13 00:00:00.000000

  · cotizaciones.persona_id deja de ser obligatorio.

Alguien entra al local, compra y no quiere dar su RUT. Inventar un RUT
genérico serían datos falsos, y crear una clienta por venta llenaría Clientes
de "Venta en el local" repetidas: la venta queda sin clienta (decisión del
usuario 2026-10-13). Ver core/pedidos/venta_rapida.py.

No toca datos: todo pedido que existe tiene clienta y la sigue teniendo.

Escrita a mano a propósito: en la base hay un tipo `estadocotizacion` viejo
que la autogeneración intentaría reconciliar.
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'f5c7e1a3d982'
down_revision: Union[str, Sequence[str], None] = 'e4b6d0f2c871'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('cotizaciones', 'persona_id', nullable=True)


def downgrade() -> None:
    # Solo se puede volver atrás si no hay ventas sin clienta: no se inventa una.
    op.alter_column('cotizaciones', 'persona_id', nullable=False)
