"""Add afecta_apariencia to attribute

Revision ID: a7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-08-17 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a7b8c9d0e1f2'
down_revision: Union[str, None] = 'f6a7b8c9d0e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Declara si una característica cambia cómo se ve la prenda. Es lo que
    # separa una tarjeta de otra en el explorador. Lo marca la clienta desde el
    # panel, igual que is_filterable: el sistema no puede adivinarlo porque el
    # catálogo es genérico (hoy ropa, mañana biblias o lápices).
    op.add_column('attribute', sa.Column('afecta_apariencia', sa.Boolean(),
                                         nullable=False, server_default=sa.false()))


def downgrade() -> None:
    op.drop_column('attribute', 'afecta_apariencia')
