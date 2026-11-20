"""El arqueo de la caja: fondo con que parte el cajón y lo contado al cerrar

Revision ID: b5e1a7c9d642
Revises: a4d0f6b8c531
Create Date: 2026-11-20 00:00:00.000000

  · tabla arqueos_caja: un registro por día (core/caja/arqueo.py).

El cierre decía solo el efectivo cobrado en el día, y nadie sabía con cuánto
había partido el cajón: no se podía cuadrar (reportado por QA 2026-11-20).
Los días anteriores quedan sin arqueo: no se sabe con cuánto partieron.

Escrita a mano a propósito: en la base hay un tipo `estadocotizacion` viejo
que la autogeneración intentaría reconciliar.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'b5e1a7c9d642'
down_revision: Union[str, Sequence[str], None] = 'a4d0f6b8c531'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'arqueos_caja',
        sa.Column('fecha', sa.Date(), primary_key=True),
        sa.Column('fondo_inicial', sa.Integer(), nullable=True),
        sa.Column('abierto_por', sa.String(length=120), nullable=True),
        sa.Column('abierto_en', sa.DateTime(), nullable=True),
        sa.Column('contado', sa.Integer(), nullable=True),
        sa.Column('deja', sa.Integer(), nullable=True),
        sa.Column('nota', sa.String(length=500), nullable=True),
        sa.Column('cerrado_por', sa.String(length=120), nullable=True),
        sa.Column('cerrado_en', sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('arqueos_caja')
