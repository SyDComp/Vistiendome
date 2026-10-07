"""Prendas con producto, precio en tres estados, retiro sin datos de despacho

Revision ID: c3e8a1f5d702
Revises: b7d41c9e2a58
Create Date: 2026-10-07 00:00:00.000000

- cotizacion_items.producto_id: de qué producto es la prenda, aunque no sea
  una variante exacta.
- cotizacion_items.precio_unitario_estimado admite nulo: "por cotizar".

LO QUE YA EXISTE
  · Las prendas con variante reciben su producto: se sabe con certeza, por la
    variante. Las que no tienen variante NO se vinculan: adivinar el producto
    por el nombre sería inventar.
  · Los precios en 0 pasan a "por cotizar": ninguno lo eligió nadie como
    "sin costo", porque esa opción no existía. Eran el valor por defecto.
  · Un retiro no guarda región, comuna ni dirección; y un texto vacío en esos
    campos es "sin dato", no un dato.

Escrita a mano a propósito: en la base hay un tipo `estadocotizacion` viejo
que la autogeneración intentaría reconciliar.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'c3e8a1f5d702'
down_revision: Union[str, Sequence[str], None] = 'b7d41c9e2a58'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('cotizacion_items', sa.Column('producto_id', sa.Integer(), nullable=True))
    op.create_foreign_key('cotizacion_items_producto_id_fkey', 'cotizacion_items', 'product', ['producto_id'], ['id'])
    op.create_index('ix_cotizacion_items_producto_id', 'cotizacion_items', ['producto_id'])
    op.alter_column('cotizacion_items', 'precio_unitario_estimado', existing_type=sa.Float(), nullable=True)

    op.execute(
        "UPDATE cotizacion_items ci SET producto_id = s.product_id "
        "FROM sku s WHERE ci.sku_id = s.id AND ci.producto_id IS NULL"
    )
    op.execute("UPDATE cotizacion_items SET precio_unitario_estimado = NULL WHERE precio_unitario_estimado <= 0")
    op.execute(
        "UPDATE cotizaciones SET region = NULL, comuna = NULL, direccion = NULL "
        "WHERE modo_entrega = 'RETIRO'"
    )
    for campo in ('region', 'comuna', 'direccion'):
        op.execute(f"UPDATE cotizaciones SET {campo} = NULL WHERE trim({campo}) = ''")


def downgrade() -> None:
    # Volver atrás no puede distinguir "por cotizar" de "sin costo": los dos
    # vuelven a ser 0, que es justo la ambigüedad que esta migración quitó.
    op.execute("UPDATE cotizacion_items SET precio_unitario_estimado = 0 WHERE precio_unitario_estimado IS NULL")
    op.alter_column('cotizacion_items', 'precio_unitario_estimado', existing_type=sa.Float(), nullable=False)
    op.drop_index('ix_cotizacion_items_producto_id', table_name='cotizacion_items')
    op.drop_constraint('cotizacion_items_producto_id_fkey', 'cotizacion_items', type_='foreignkey')
    op.drop_column('cotizacion_items', 'producto_id')
