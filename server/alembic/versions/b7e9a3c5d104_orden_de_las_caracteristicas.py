"""En qué orden se muestran las características

Revision ID: b7e9a3c5d104
Revises: a6d8f2b4c093
Create Date: 2026-10-26 00:00:00.000000

  · attribute.orden: la posición de cada característica (1, 2, 3…).

Hasta ahora el orden estaba fijo en el navegador: talla, color y estampado
primero, y el resto por nombre. Se parte de ese mismo orden, así nada cambia
de lugar hasta que la tienda lo mueva desde Características (decisión del
usuario 2026-10-26). Ver core/caracteristicas/orden.py.

Escrita a mano a propósito: en la base hay un tipo `estadocotizacion` viejo
que la autogeneración intentaría reconciliar.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'b7e9a3c5d104'
down_revision: Union[str, Sequence[str], None] = 'a6d8f2b4c093'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('attribute', sa.Column('orden', sa.Integer(), nullable=False, server_default='0'))
    op.execute("""
        UPDATE attribute SET orden = o.posicion
        FROM (
            SELECT id, row_number() OVER (ORDER BY
                CASE upper(name) WHEN 'TALLA' THEN 1 WHEN 'COLOR' THEN 2 WHEN 'ESTAMPADO' THEN 3 ELSE 4 END,
                upper(name)) AS posicion
            FROM attribute
        ) o
        WHERE attribute.id = o.id
    """)


def downgrade() -> None:
    op.drop_column('attribute', 'orden')
