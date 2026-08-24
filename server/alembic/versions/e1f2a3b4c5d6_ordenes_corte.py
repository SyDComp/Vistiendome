"""ordenes de corte

Revision ID: e1f2a3b4c5d6
Revises: d0e1f2a3b4c5
Create Date: 2026-08-24

"""
from alembic import op
import sqlalchemy as sa

revision = 'e1f2a3b4c5d6'
down_revision = 'd0e1f2a3b4c5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Correlativo humano, mismo patrón que cotizaciones_numero_seq
    op.execute("CREATE SEQUENCE IF NOT EXISTS ordenes_corte_numero_seq START 1")

    op.create_table(
        'ordenes_corte',
        sa.Column('id', sa.String(length=26), nullable=False),
        sa.Column('numero', sa.Integer(), nullable=True),
        sa.Column('estado', sa.String(length=20), nullable=False, server_default='PENDIENTE'),
        sa.Column('notas', sa.String(), nullable=True),
        sa.Column('repetida_de_id', sa.String(length=26), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('finalizada_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['repetida_de_id'], ['ordenes_corte.id']),
        sa.UniqueConstraint('numero'),
    )
    op.create_index('ix_ordenes_corte_numero', 'ordenes_corte', ['numero'])
    op.create_index('ix_ordenes_corte_estado', 'ordenes_corte', ['estado'])

    op.create_table(
        'orden_corte_items',
        sa.Column('id', sa.String(length=26), nullable=False),
        sa.Column('orden_id', sa.String(length=26), nullable=False),
        sa.Column('sku_id', sa.Integer(), nullable=False),
        sa.Column('cantidad', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('cotizacion_item_id', sa.String(length=26), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['orden_id'], ['ordenes_corte.id']),
        sa.ForeignKeyConstraint(['sku_id'], ['sku.id']),
        sa.ForeignKeyConstraint(['cotizacion_item_id'], ['cotizacion_items.id']),
    )
    op.create_index('ix_orden_corte_items_orden_id', 'orden_corte_items', ['orden_id'])
    op.create_index('ix_orden_corte_items_sku_id', 'orden_corte_items', ['sku_id'])
    op.create_index('ix_orden_corte_items_cot_item', 'orden_corte_items', ['cotizacion_item_id'])


def downgrade() -> None:
    op.drop_table('orden_corte_items')
    op.drop_table('ordenes_corte')
    op.execute("DROP SEQUENCE IF EXISTS ordenes_corte_numero_seq")
