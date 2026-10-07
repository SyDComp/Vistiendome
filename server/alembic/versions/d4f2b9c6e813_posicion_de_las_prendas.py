"""Posición de las prendas dentro del pedido

Revision ID: d4f2b9c6e813
Revises: c3e8a1f5d702
Create Date: 2026-10-07 00:00:00.000000

Las prendas se mostraban en el orden en que las devolvía Postgres: después de
editar una (cotizarla), saltaba de lugar. Ahora tienen su posición, el orden
en que se agregaron. El id no sirve para ordenarlas: dos ULID del mismo
milisegundo no salen en orden.

Lo que ya existe recibe el mejor orden disponible, el del id.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd4f2b9c6e813'
down_revision: Union[str, Sequence[str], None] = 'c3e8a1f5d702'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('cotizacion_items', sa.Column('posicion', sa.Integer(), nullable=False, server_default='0'))
    op.execute(
        "UPDATE cotizacion_items ci SET posicion = o.n FROM ("
        " SELECT id, row_number() OVER (PARTITION BY cotizacion_id ORDER BY id) - 1 AS n FROM cotizacion_items"
        ") o WHERE ci.id = o.id"
    )


def downgrade() -> None:
    op.drop_column('cotizacion_items', 'posicion')
