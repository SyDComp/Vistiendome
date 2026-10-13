"""Pagos de los pedidos

Revision ID: c2f4b8d0a659
Revises: b9e1a7c3f548
Create Date: 2026-10-13 00:00:00.000000

  · pagos: lo que la clienta pagó de cada pedido. Un libro, como la bodega: un
    pago no se borra ni se edita, se anula con motivo. Monto entero en pesos.

Los medios de pago viven en ajustes_negocio y valen su lista por defecto hasta
que se guarden: no hace falta una fila.

Escrita a mano a propósito: en la base hay un tipo `estadocotizacion` viejo
que la autogeneración intentaría reconciliar.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'c2f4b8d0a659'
down_revision: Union[str, Sequence[str], None] = 'b9e1a7c3f548'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'pagos',
        sa.Column('id', sa.String(length=26), primary_key=True),
        sa.Column('cotizacion_id', sa.String(length=26), sa.ForeignKey('cotizaciones.id'), nullable=True),
        sa.Column('tipo', sa.String(length=12), nullable=False),
        sa.Column('monto', sa.Integer(), nullable=False),
        sa.Column('medio', sa.String(length=60), nullable=False),
        sa.Column('nota', sa.String(length=300), nullable=True),
        sa.Column('registrado_por_id', sa.String(length=26), nullable=True),
        sa.Column('registrado_por', sa.String(length=120), nullable=True),
        sa.Column('registrado_en', sa.DateTime(timezone=True), nullable=False),
        sa.Column('anulado_en', sa.DateTime(timezone=True), nullable=True),
        sa.Column('anulado_por', sa.String(length=120), nullable=True),
        sa.Column('anulado_motivo', sa.String(length=300), nullable=True),
        sa.CheckConstraint('monto > 0', name='ck_pagos_monto_positivo'),
    )
    op.create_index('ix_pagos_cotizacion_id', 'pagos', ['cotizacion_id'])


def downgrade() -> None:
    op.drop_index('ix_pagos_cotizacion_id', table_name='pagos')
    op.drop_table('pagos')
