"""change_transporte_to_varchar

Revision ID: e5f6a7b8c9d0
Revises: b78aac609d67
Create Date: 2026-07-14 12:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, None] = 'b78aac609d67'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('cotizaciones', 'transporte',
               existing_type=sa.Enum('STARKEN', 'CORREOS_DE_CHILE', 'CHILEXPRESS', 'RETIRO_LOCAL', 'OTRO', name='tipotransporte'),
               type_=sqlmodel.sql.sqltypes.AutoString(length=100),
               existing_nullable=True)


def downgrade() -> None:
    op.alter_column('cotizaciones', 'transporte',
               existing_type=sqlmodel.sql.sqltypes.AutoString(length=100),
               type_=sa.Enum('STARKEN', 'CORREOS_DE_CHILE', 'CHILEXPRESS', 'RETIRO_LOCAL', 'OTRO', name='tipotransporte'),
               existing_nullable=True)
