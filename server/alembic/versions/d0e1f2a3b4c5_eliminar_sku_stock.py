"""eliminar columna muerta sku.stock

El libro de movimientos (StockMovement) es la única autoridad del stock en
todos lados (público y admin) desde antes de esta migración. Nadie escribe
esta columna en el código vivo — se persiste en 0 y nadie la lee como verdad.
Dejarla es una trampa para el próximo que escriba sku.stock de buena fe.

Revision ID: d0e1f2a3b4c5
Revises: c9d0e1f2a3b4
Create Date: 2026-08-23

"""
from alembic import op
import sqlalchemy as sa

revision = 'd0e1f2a3b4c5'
down_revision = 'c9d0e1f2a3b4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column('sku', 'stock')


def downgrade() -> None:
    op.add_column('sku', sa.Column('stock', sa.Integer(), nullable=False, server_default='0'))
