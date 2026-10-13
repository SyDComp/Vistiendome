"""Teléfono de cada pedido, tal como se dio

Revision ID: d3a5c9e1b760
Revises: c2f4b8d0a659
Create Date: 2026-10-13 00:00:00.000000

  · cotizaciones.telefono_contacto: el teléfono que se dio en ESTE pedido.

El de la clienta (personas.telefono) es el primero que dio, y no cambia: no
sirve para saber con qué número se hizo cada pedido. Hace falta para
comprobar que quien usa un saldo a favor es la misma persona que lo dejó
(core/pagos/verificar.py), igual que ya se guarda el nombre de cada pedido.

Los pedidos anteriores quedan sin él: no se sabe con qué número se hicieron,
y no se inventa.

Escrita a mano a propósito: en la base hay un tipo `estadocotizacion` viejo
que la autogeneración intentaría reconciliar.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd3a5c9e1b760'
down_revision: Union[str, Sequence[str], None] = 'c2f4b8d0a659'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('cotizaciones', sa.Column('telefono_contacto', sa.String(length=20), nullable=True))


def downgrade() -> None:
    op.drop_column('cotizaciones', 'telefono_contacto')
