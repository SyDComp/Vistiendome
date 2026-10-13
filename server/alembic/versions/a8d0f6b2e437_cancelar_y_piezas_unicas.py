"""Prendas canceladas y piezas únicas

Revision ID: a8d0f6b2e437
Revises: f6b8d4e0c215
Create Date: 2026-10-13 00:00:00.000000

  · cotizacion_items.cancelada_en: la prenda cancelada no se borra, se marca.
  · piezas_unicas: prendas personalizadas hechas cuyo pedido se canceló. Lo del
    catálogo vuelve a su variante en bodega; esto no tiene variante y sin una
    tabla propia quedaba en el limbo (decisión del usuario 2026-10-13).
  · cotizacion_items.pieza_id: una prenda que es una pieza única de la bodega.

No toca datos: nada de lo que hay está cancelado por prenda ni es pieza única.

Escrita a mano a propósito: en la base hay un tipo `estadocotizacion` viejo
que la autogeneración intentaría reconciliar.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a8d0f6b2e437'
down_revision: Union[str, Sequence[str], None] = 'f6b8d4e0c215'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE SEQUENCE piezas_unicas_numero_seq")
    op.create_table(
        'piezas_unicas',
        sa.Column('id', sa.String(length=26), primary_key=True),
        sa.Column('numero', sa.Integer(), nullable=True),
        sa.Column('nombre', sa.String(length=255), nullable=False),
        sa.Column('producto_id', sa.Integer(), sa.ForeignKey('product.id'), nullable=True),
        sa.Column('config', sa.JSON(), nullable=False),
        sa.Column('config_propuesta', sa.JSON(), nullable=False),
        sa.Column('origen_item_id', sa.String(length=26),
                  sa.ForeignKey('cotizacion_items.id', ondelete='SET NULL'), nullable=True),
        sa.Column('origen_pedido_numero', sa.Integer(), nullable=True),
        sa.Column('estado', sa.String(length=12), nullable=False, server_default='DISPONIBLE'),
        sa.Column('nota', sa.String(length=500), nullable=True),
        sa.Column('creada_en', sa.DateTime(timezone=True), nullable=False),
        sa.Column('actualizada_en', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_piezas_unicas_numero', 'piezas_unicas', ['numero'], unique=True)
    op.create_index('ix_piezas_unicas_estado', 'piezas_unicas', ['estado'])
    op.create_index('ix_piezas_unicas_origen_item_id', 'piezas_unicas', ['origen_item_id'])

    op.add_column('cotizacion_items', sa.Column('cancelada_en', sa.DateTime(timezone=True), nullable=True))
    op.add_column('cotizacion_items', sa.Column('pieza_id', sa.String(length=26),
                                                sa.ForeignKey('piezas_unicas.id'), nullable=True))


def downgrade() -> None:
    op.drop_column('cotizacion_items', 'pieza_id')
    op.drop_column('cotizacion_items', 'cancelada_en')
    op.drop_index('ix_piezas_unicas_origen_item_id', table_name='piezas_unicas')
    op.drop_index('ix_piezas_unicas_estado', table_name='piezas_unicas')
    op.drop_index('ix_piezas_unicas_numero', table_name='piezas_unicas')
    op.drop_table('piezas_unicas')
    op.execute("DROP SEQUENCE piezas_unicas_numero_seq")
