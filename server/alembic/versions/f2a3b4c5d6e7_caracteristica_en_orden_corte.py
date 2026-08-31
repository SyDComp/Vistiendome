"""Característica: en_orden_corte

Nueva propiedad que decide la clienta, característica por característica: si esa
característica sale impresa en la orden de corte.

Por qué existe: la hoja que va a la mesa de corte tiene una columna por
característica. La costurera necesita talla y color; el material o el tipo de
cuello pueden sobrarle, y una columna de más en una hoja de taller es ruido.
Hasta ahora salían todas, sin que nadie pudiera decidirlo.

Arranca en TRUE a propósito: así nada desaparece de la hoja por omisión, y
quitar una columna es una decisión explícita. Al revés, una característica
nueva se ausentaría de la orden sin que nadie se entere, y eso se descubre
cuando la prenda ya está mal cortada.

Revision ID: f2a3b4c5d6e7
Revises: e1f2a3b4c5d6
"""
from alembic import op
import sqlalchemy as sa

revision = 'f2a3b4c5d6e7'
down_revision = 'e1f2a3b4c5d6'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'attribute',
        sa.Column('en_orden_corte', sa.Boolean(), nullable=False, server_default=sa.true()),
    )


def downgrade():
    op.drop_column('attribute', 'en_orden_corte')
