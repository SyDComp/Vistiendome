"""Marcar que valores los propuso el cliente

Revision ID: e7f8a9b0c1d2
Revises: d6e7f8a9b0c1

Una pieza personalizada puede llevar un color o una talla que el cliente
propuso y que NO existe en el catalogo. Para el taller no es lo mismo: un valor
del catalogo se corta con tela que hay; uno propuesto hay que conseguirlo antes
de prometer una fecha.

Se guarda explicito y no se deduce comparando contra el catalogo, porque lo que
importa es que en el momento del pedido ese valor no existia. Si manana se
crea, el pedido viejo sigue diciendo la verdad de lo que paso — igual que un
contrato firmado no se reescribe solo.
"""
from alembic import op
import sqlalchemy as sa


revision = 'e7f8a9b0c1d2'
down_revision = 'd6e7f8a9b0c1'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('cotizacion_items', sa.Column('config_propuesta', sa.JSON(), nullable=True))
    op.add_column('orden_corte_items', sa.Column('config_propuesta', sa.JSON(), nullable=True))


def downgrade():
    op.drop_column('orden_corte_items', 'config_propuesta')
    op.drop_column('cotizacion_items', 'config_propuesta')
