"""La política de cambios que valía cuando se entregó cada pedido

Revision ID: a6d8f2b4c093
Revises: f5c7e1a3d982
Create Date: 2026-10-20 00:00:00.000000

  · cotizaciones.politica_cambios: {plazo, unidad, personalizadas_sin_cambio},
    copiada del ajuste al entregar (core/pedidos/ciclo/despacho.py).

El comprobante de la caja dice el plazo para cambios. Si se reimprime después
de que la tienda cambió su política, tiene que decir lo que se le prometió a
esa clienta, no lo de hoy (decisión del usuario 2026-10-20).

Lo ya entregado queda en nulo: no se sabe qué política valía entonces, y no
se inventa.

Escrita a mano a propósito: en la base hay un tipo `estadocotizacion` viejo
que la autogeneración intentaría reconciliar.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a6d8f2b4c093'
down_revision: Union[str, Sequence[str], None] = 'f5c7e1a3d982'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('cotizaciones', sa.Column('politica_cambios', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('cotizaciones', 'politica_cambios')
