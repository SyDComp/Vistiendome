"""Add numero correlativo to cotizaciones

Revision ID: f6a7b8c9d0e1
Revises: d4e5f6a7b8c9, e5f6a7b8c9d0
Create Date: 2026-08-10 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'f6a7b8c9d0e1'
down_revision: Union[str, Sequence[str], None] = ('d4e5f6a7b8c9', 'e5f6a7b8c9d0')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Fusiona las dos cabezas divergentes del historial (d4e5f6a7b8c9 y
    # e5f6a7b8c9d0 ambas partían de b78aac609d67) — no cambia nada de
    # ninguna de las dos, solo declara que esta migración depende de ambas.

    # Correlativo humano ("N° pedido") para hablar de una cotización por
    # teléfono, en una etiqueta o en el taller — el id (ULID) no sirve para
    # eso. Se calcula explícitamente en la app vía nextval(), no con un
    # server_default de columna, para no depender de cómo SQLAlchemy decide
    # incluir u omitir columnas None en el INSERT.
    op.add_column('cotizaciones', sa.Column('numero', sa.Integer(), nullable=True))

    # Backfill de las filas existentes, en orden cronológico real (no el
    # orden físico de la tabla, que no está garantizado).
    op.execute("""
        WITH ordenadas AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
            FROM cotizaciones
        )
        UPDATE cotizaciones
        SET numero = ordenadas.rn
        FROM ordenadas
        WHERE cotizaciones.id = ordenadas.id
    """)

    op.execute("""
        CREATE SEQUENCE IF NOT EXISTS cotizaciones_numero_seq
        OWNED BY cotizaciones.numero
    """)
    op.execute("""
        SELECT setval('cotizaciones_numero_seq', COALESCE((SELECT MAX(numero) FROM cotizaciones), 0) + 1, false)
    """)

    op.alter_column('cotizaciones', 'numero', nullable=False)
    op.create_unique_constraint('cotizaciones_numero_key', 'cotizaciones', ['numero'])
    op.create_index('ix_cotizaciones_numero', 'cotizaciones', ['numero'])


def downgrade() -> None:
    op.drop_index('ix_cotizaciones_numero', table_name='cotizaciones')
    op.drop_constraint('cotizaciones_numero_key', 'cotizaciones', type_='unique')
    op.drop_column('cotizaciones', 'numero')
    op.execute("DROP SEQUENCE IF EXISTS cotizaciones_numero_seq")
