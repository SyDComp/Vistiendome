"""De dónde sale cada prenda (bodega o taller) y cuándo se confirmó el pedido

Revision ID: f6b8d4e0c215
Revises: e5a7c3d9b104
Create Date: 2026-10-13 00:00:00.000000

  · cotizacion_items.camino: BODEGA o TALLER. Se decide al confirmar.
  · cotizaciones.confirmada_en: decide quién se lleva primero lo que hay en
    bodega cuando dos pedidos esperan la misma prenda.

LO QUE YA ESTABA CONFIRMADO O DESPACHADO (aprobado): sus prendas quedan con
camino TALLER. Así se trabajaban hasta hoy, y no apartan nada de la bodega.
Su `confirmada_en` queda nulo: no se sabe cuándo se confirmaron y no se inventa.

Escrita a mano a propósito: en la base hay un tipo `estadocotizacion` viejo
que la autogeneración intentaría reconciliar.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'f6b8d4e0c215'
down_revision: Union[str, Sequence[str], None] = 'e5a7c3d9b104'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('cotizacion_items', sa.Column('camino', sa.String(length=10), nullable=True))
    op.add_column('cotizaciones', sa.Column('confirmada_en', sa.DateTime(timezone=True), nullable=True))

    resultado = op.get_bind().execute(sa.text(
        "UPDATE cotizacion_items SET camino = 'TALLER' "
        "WHERE cotizacion_id IN (SELECT id FROM cotizaciones WHERE estado IN ('CONFIRMADA', 'DESPACHADA'))"
    ))
    print(f"  prendas de pedidos ya confirmados o despachados, ahora por TALLER: {resultado.rowcount}")


def downgrade() -> None:
    op.drop_column('cotizaciones', 'confirmada_en')
    op.drop_column('cotizacion_items', 'camino')
