"""Las piezas personalizadas guardan sus caracteristicas

Revision ID: d6e7f8a9b0c1
Revises: c5d6e7f8a9b0

Un encargo especial se corta igual que cualquier otra prenda: hace falta la
talla, el color, el cuello. Hasta ahora el "item libre" era solo un nombre y un
precio, asi que esa pieza llegaba al taller sin nada con que cortarla y la
costurera tenia que preguntar.

Reportado por QA: "si agrego un producto personalizado deberia poder poner las
mismas caracteristicas que se necesitan para mandarlo a corte".

Mismo formato que SKU.config ({"TALLA": "M", "COLOR": "Uva"}), para que la
planilla del taller las muestre en columnas sin distinguir el origen.
"""
from alembic import op
import sqlalchemy as sa


revision = 'd6e7f8a9b0c1'
down_revision = 'c5d6e7f8a9b0'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('cotizacion_items', sa.Column('config_custom', sa.JSON(), nullable=True))
    op.add_column('orden_corte_items', sa.Column('config_custom', sa.JSON(), nullable=True))


def downgrade():
    op.drop_column('orden_corte_items', 'config_custom')
    op.drop_column('cotizacion_items', 'config_custom')
