"""Marca Color y Estampado como visuales por defecto

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-08-17 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b8c9d0e1f2a3'
down_revision: Union[str, None] = 'a7b8c9d0e1f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Color y Estampado son características del sistema (no se borran ni se
    # renombran) y por definición cambian cómo se ve la prenda: vienen marcadas.
    # Talla también es del sistema y NO es visual, así que no se marca por
    # is_system sino por identidad.
    #
    # Se filtra por system_id y no por nombre: el nombre podría estar cargado
    # distinto, el system_id es el identificador estable.
    op.execute("""
        UPDATE attribute
        SET afecta_apariencia = true
        WHERE system_id IN ('sys_color', 'sys_pattern')
    """)


def downgrade() -> None:
    op.execute("""
        UPDATE attribute
        SET afecta_apariencia = false
        WHERE system_id IN ('sys_color', 'sys_pattern')
    """)
