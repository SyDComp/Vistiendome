"""Fecha comprometida de cada pedido

Revision ID: b9e1a7c3f548
Revises: a8d0f6b2e437
Create Date: 2026-10-13 00:00:00.000000

  · cotizaciones.fecha_comprometida: para cuándo se le prometió a la clienta.
    Fecha de calendario, sin hora.

Los pedidos ya confirmados quedan sin fecha: no se inventa (decisión del
usuario 2026-10-13; esos pedidos de prueba se borrarán en la purga). El plazo
habitual vive en ajustes_negocio y vale su valor por defecto hasta que se
guarde: no hace falta una fila.

Escrita a mano a propósito: en la base hay un tipo `estadocotizacion` viejo
que la autogeneración intentaría reconciliar.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'b9e1a7c3f548'
down_revision: Union[str, Sequence[str], None] = 'a8d0f6b2e437'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('cotizaciones', sa.Column('fecha_comprometida', sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column('cotizaciones', 'fecha_comprometida')
