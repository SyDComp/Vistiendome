"""Las prendas de bodega que el taller ya fue a buscar

Revision ID: d1a9c3e5f207
Revises: c8f0b4d6e215
Create Date: 2026-10-28 00:00:00.000000

  · cotizacion_items.encontrada: la marca la orden de corte al finalizar,
    para las prendas por bodega (core/pedidos/ciclo/tarea.py).

La orden de corte pasa a ser la hoja de trabajo del taller: lo que hay que
hacer y lo que hay que ir a buscar en bodega para completar un pedido. Un
pedido queda listo cuando todo está hecho o encontrado (decisión del usuario
2026-10-28).

Lo anterior queda en falso: los pedidos confirmados con prendas de bodega
vuelven a "por buscar" hasta que pasen por una orden. Hoy son de prueba.

Escrita a mano a propósito: en la base hay un tipo `estadocotizacion` viejo
que la autogeneración intentaría reconciliar.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd1a9c3e5f207'
down_revision: Union[str, Sequence[str], None] = 'c8f0b4d6e215'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('cotizacion_items',
                  sa.Column('encontrada', sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    op.drop_column('cotizacion_items', 'encontrada')
