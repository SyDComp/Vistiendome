"""La historia del pedido se ordena por un correlativo, no por la hora

Revision ID: e4b6d0f2c871
Revises: d3a5c9e1b760
Create Date: 2026-10-13 00:00:00.000000

  · pedido_eventos.secuencia: en qué orden se anotó cada evento.

Antes se ordenaba por la hora y, si empataba, por el id (ULID). Una acción
anota varias cosas en el mismo instante (cancelar un pedido anota cada prenda
y después el estado), y un ULID no crece en orden dentro de un mismo
milisegundo: la historia podía mostrarlas al revés.

Los eventos que ya existen se numeran en el orden en que se mostraban hasta
hoy (hora, id), para no cambiar lo que ya se veía.

Escrita a mano a propósito: en la base hay un tipo `estadocotizacion` viejo
que la autogeneración intentaría reconciliar.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e4b6d0f2c871'
down_revision: Union[str, Sequence[str], None] = 'd3a5c9e1b760'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE SEQUENCE pedido_eventos_secuencia_seq")
    op.add_column('pedido_eventos', sa.Column('secuencia', sa.BigInteger(), nullable=True))
    op.execute("""
        UPDATE pedido_eventos AS e SET secuencia = o.n
        FROM (SELECT id, row_number() OVER (ORDER BY ocurrido_at, id) AS n FROM pedido_eventos) AS o
        WHERE e.id = o.id
    """)
    # Lo que se anote desde ahora va a continuación del último.
    op.execute("""
        SELECT setval('pedido_eventos_secuencia_seq',
                      COALESCE((SELECT max(secuencia) FROM pedido_eventos), 0) + 1, false)
    """)
    op.alter_column('pedido_eventos', 'secuencia', nullable=False)
    op.create_unique_constraint('uq_pedido_eventos_secuencia', 'pedido_eventos', ['secuencia'])


def downgrade() -> None:
    op.drop_constraint('uq_pedido_eventos_secuencia', 'pedido_eventos', type_='unique')
    op.drop_column('pedido_eventos', 'secuencia')
    op.execute("DROP SEQUENCE pedido_eventos_secuencia_seq")
