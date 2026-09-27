"""Esquema base

Revision ID: c1d2e3f4a5b6
Revises:
Create Date: 2026-09-27 00:00:00.000000

Crea el esquema completo de la base: tablas, tipos, secuencias, indices y
llaves foraneas, tal como estan en `alembic/esquema_base.sql`.

Es la raiz de la cadena. Las migraciones que vengan despues parten de aca.
"""
from pathlib import Path
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'c1d2e3f4a5b6'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ESQUEMA = Path(__file__).resolve().parent.parent / "esquema_base.sql"


def upgrade() -> None:
    op.get_bind().exec_driver_sql(ESQUEMA.read_text(encoding="utf-8"))


def downgrade() -> None:
    raise NotImplementedError(
        "El esquema base no se revierte: hacerlo borraria todas las tablas con sus datos."
    )
