"""add sale (oferta temporal) fields to product and sku

Revision ID: a1b2c3d4e5f6
Revises: b78aac609d67
Create Date: 2026-06-24

Agrega campos de oferta temporal:
- product.sale_percent / sale_start / sale_end  (descuento % a nivel producto)
- sku.sale_price / sale_start / sale_end         (precio absoluto override por variante)
Todas las columnas son nullable -> migración no destructiva y reversible.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'b78aac609d67'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('product', sa.Column('sale_percent', sa.Float(), nullable=True))
    op.add_column('product', sa.Column('sale_start', sa.DateTime(), nullable=True))
    op.add_column('product', sa.Column('sale_end', sa.DateTime(), nullable=True))

    op.add_column('sku', sa.Column('sale_price', sa.Float(), nullable=True))
    op.add_column('sku', sa.Column('sale_start', sa.DateTime(), nullable=True))
    op.add_column('sku', sa.Column('sale_end', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('sku', 'sale_end')
    op.drop_column('sku', 'sale_start')
    op.drop_column('sku', 'sale_price')

    op.drop_column('product', 'sale_end')
    op.drop_column('product', 'sale_start')
    op.drop_column('product', 'sale_percent')
