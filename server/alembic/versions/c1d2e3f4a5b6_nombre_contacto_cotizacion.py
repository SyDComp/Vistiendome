"""Add nombre_contacto to cotizaciones

Revision ID: c1d2e3f4a5b6
Revises: f8a9b0c1d2e3
Create Date: 2026-09-27 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'c1d2e3f4a5b6'
down_revision: Union[str, Sequence[str], None] = 'f8a9b0c1d2e3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # El nombre que la persona escribio EN ESE pedido, tal cual. La identidad
    # del cliente la decide el RUT (unico en `personas`); dos pedidos con el
    # mismo RUT son la misma Persona aunque el nombre tecleado difiera de
    # verdad. Pero "misma Persona" para identidad no implica que el nombre
    # guardado sea el correcto para este pedido puntual: sin este campo, la
    # lista de pedidos y la orden de corte mostraban siempre el nombre de la
    # Persona vinculada, y el que se escribio recien se perdia sin quedar en
    # ningun lado.
    #
    # Nullable: los pedidos de antes de esta columna no lo tienen, y ahi se
    # sigue mostrando el de la Persona (fallback en el codigo, no backfill:
    # no hay forma de reconstruir con que nombre se escribio cada pedido
    # viejo, y adivinarlo seria peor que dejarlo en blanco).
    op.add_column('cotizaciones', sa.Column('nombre_contacto', sa.String(length=200), nullable=True))


def downgrade() -> None:
    op.drop_column('cotizaciones', 'nombre_contacto')
