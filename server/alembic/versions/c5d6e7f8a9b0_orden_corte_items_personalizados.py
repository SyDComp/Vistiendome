"""La orden de corte acepta piezas sin SKU (items personalizados)

Revision ID: c5d6e7f8a9b0
Revises: b4c5d6e7f8a9

Una cotizacion puede llevar una pieza que no existe en el catalogo: el "item
libre" que la clienta arma a mano para un encargo especial. `cotizacion_items`
ya lo soportaba (sku_id nullable + nombre_custom), pero `orden_corte_items`
exigia un sku_id, asi que esa pieza NO podia entrar a una orden de corte. El
pedido llegaba al taller incompleto y nadie la confeccionaba.

Reportado por QA: "si agrego una cotizacion personalizada esta no se agrega a
la orden de corte".

Sin SKU, el nombre es lo unico que identifica la pieza en la planilla, asi que
viaja con ella.
"""
from alembic import op
import sqlalchemy as sa


revision = 'c5d6e7f8a9b0'
down_revision = 'b4c5d6e7f8a9'
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column('orden_corte_items', 'sku_id',
                    existing_type=sa.Integer(), nullable=True)
    op.add_column('orden_corte_items',
                  sa.Column('nombre_custom', sa.String(length=255), nullable=True))


def downgrade():
    # Las filas sin SKU no pueden volver a un esquema que lo exige: se borran,
    # que es lo unico honesto. Son piezas de corte, no ventas.
    op.execute("DELETE FROM orden_corte_items WHERE sku_id IS NULL")
    op.drop_column('orden_corte_items', 'nombre_custom')
    op.alter_column('orden_corte_items', 'sku_id',
                    existing_type=sa.Integer(), nullable=False)
