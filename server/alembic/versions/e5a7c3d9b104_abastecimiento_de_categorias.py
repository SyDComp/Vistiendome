"""Cómo se abastece cada categoría y si acepta personalizaciones

Revision ID: e5a7c3d9b104
Revises: d4f2b9c6e813
Create Date: 2026-10-07 00:00:00.000000

Dos ajustes por categoría, con herencia (nulo = igual que su padre):
  · abastecimiento: qué pasa cuando no hay en bodega. TALLER o SOLO_BODEGA.
  · acepta_personalizacion: si la clienta puede proponer lo que no existe.

VALORES INICIALES (aprobados)
  Vestimenta  → se confecciona en el taller, acepta personalizaciones
  Accesorios, Lecturas, Librería → solo lo que hay en bodega, no acepta
  Sin Categoría → abastecimiento sin valor: se decide al confirmar; no acepta
Las subcategorías quedan heredando.

Una categoría principal siempre dice sus ajustes. Si en esta base hay otra
principal que no es ninguna de las de arriba, recibe los de Vestimenta (la
tienda es de ropa) y queda anotado en el registro de la migración.

Escrita a mano a propósito: en la base hay un tipo `estadocotizacion` viejo
que la autogeneración intentaría reconciliar.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e5a7c3d9b104'
down_revision: Union[str, Sequence[str], None] = 'd4f2b9c6e813'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

INICIALES = {
    'vestimenta': ('TALLER', True),
    'accesorios': ('SOLO_BODEGA', False),
    'lecturas': ('SOLO_BODEGA', False),
    'libreria': ('SOLO_BODEGA', False),
    'sin_categoria': (None, False),
}


def upgrade() -> None:
    op.add_column('category', sa.Column('abastecimiento', sa.String(length=20), nullable=True))
    op.add_column('category', sa.Column('acepta_personalizacion', sa.Boolean(), nullable=True))

    conexion = op.get_bind()
    poner = sa.text("UPDATE category SET abastecimiento = :a, acepta_personalizacion = :p WHERE id = :id")
    for fila in conexion.execute(sa.text("SELECT id, slug, name FROM category WHERE parent_id IS NULL")).all():
        if fila.slug in INICIALES:
            abastecimiento, acepta = INICIALES[fila.slug]
        else:
            abastecimiento, acepta = INICIALES['vestimenta']
            print(f"  categoría principal sin valor inicial acordado: {fila.name!r} → como Vestimenta")
        conexion.execute(poner, {"a": abastecimiento, "p": acepta, "id": fila.id})


def downgrade() -> None:
    op.drop_column('category', 'acepta_personalizacion')
    op.drop_column('category', 'abastecimiento')
