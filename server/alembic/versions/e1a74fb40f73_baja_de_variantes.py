"""Baja de variantes e índices del libro de bodega

Revision ID: e1a74fb40f73
Revises: e688c40a31b3
Create Date: 2026-10-07 00:00:00.000000

Una variante con historia (movimientos de bodega, pedidos, cortes) ya no se
borra: se da de baja. Deja de venderse y de mostrarse, y su historia sigue
apuntándole.

Los índices son para el libro de bodega, que se consulta por variante y por
el hecho que causó cada movimiento.

Escrita a mano a propósito: en la base hay un tipo `estadocotizacion` viejo
que la autogeneración intentaría reconciliar.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e1a74fb40f73'
down_revision: Union[str, Sequence[str], None] = 'e688c40a31b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('sku', sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.create_index('ix_sku_is_deleted', 'sku', ['is_deleted'])
    op.create_index('ix_stockmovement_sku_id', 'stockmovement', ['sku_id'])
    op.create_index('ix_stockmovement_reference_id', 'stockmovement', ['reference_id'])


def downgrade() -> None:
    op.drop_index('ix_stockmovement_reference_id', table_name='stockmovement')
    op.drop_index('ix_stockmovement_sku_id', table_name='stockmovement')
    op.drop_index('ix_sku_is_deleted', table_name='sku')
    op.drop_column('sku', 'is_deleted')
