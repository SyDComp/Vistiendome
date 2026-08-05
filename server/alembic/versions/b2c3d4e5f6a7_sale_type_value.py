"""unify sale fields: sale_type + sale_value (product & sku)

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-24

Reemplaza el esquema inicial de oferta (product.sale_percent / sku.sale_price)
por uno unificado y más flexible:
- product/sku.sale_type  : 'percent' | 'fixed'
- product/sku.sale_value : número (% o precio fijo)
Las columnas sale_start / sale_end se conservan. Migración no destructiva de datos
relevantes (las columnas viejas estaban vacías).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Product
    op.add_column('product', sa.Column('sale_type', sa.String(), nullable=True))
    op.add_column('product', sa.Column('sale_value', sa.Float(), nullable=True))
    op.drop_column('product', 'sale_percent')

    # SKU
    op.add_column('sku', sa.Column('sale_type', sa.String(), nullable=True))
    op.add_column('sku', sa.Column('sale_value', sa.Float(), nullable=True))
    op.drop_column('sku', 'sale_price')


def downgrade() -> None:
    op.add_column('sku', sa.Column('sale_price', sa.Float(), nullable=True))
    op.drop_column('sku', 'sale_value')
    op.drop_column('sku', 'sale_type')

    op.add_column('product', sa.Column('sale_percent', sa.Float(), nullable=True))
    op.drop_column('product', 'sale_value')
    op.drop_column('product', 'sale_type')
