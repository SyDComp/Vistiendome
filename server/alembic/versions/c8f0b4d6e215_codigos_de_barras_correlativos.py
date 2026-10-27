"""Códigos de barras correlativos, internos y siempre válidos

Revision ID: c8f0b4d6e215
Revises: b7e9a3c5d104
Create Date: 2026-10-26 00:00:00.000000

  · secuencia codigos_barras_seq: el correlativo de cada código nuevo.
  · tabla codigos_barras_anteriores: qué código tenía cada variante antes de
    este cambio, y cuál recibió.
  · sku.barcode: TODAS las variantes pasan a 20 + correlativo + dígito de
    control, por orden de id (core/codigos_barras).

Los códigos de antes salían de un cálculo sobre el nombre o eran 13 dígitos
al azar: podían coincidir con productos comerciales o entre ellos, y 298 de
1.094 traían mal el dígito de control (un lector los descarta sin avisar).
Se cambian todos porque todavía no hay etiquetas pegadas en las prendas
(decisión del usuario 2026-10-26). Lo anterior queda en la tabla: nada se
pierde, y la vuelta atrás los restaura.

Escrita a mano a propósito: en la base hay un tipo `estadocotizacion` viejo
que la autogeneración intentaría reconciliar.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'c8f0b4d6e215'
down_revision: Union[str, Sequence[str], None] = 'b7e9a3c5d104'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Copia de core/codigos_barras/numero.py a propósito: una migración no debe
# cambiar de resultado si mañana cambia el código de la aplicación.
def _codigo(correlativo: int) -> str:
    doce = "20" + str(correlativo).zfill(10)
    suma = sum(int(d) * (1 if i % 2 == 0 else 3) for i, d in enumerate(doce))
    return doce + str((10 - suma % 10) % 10)


def upgrade() -> None:
    op.execute("CREATE SEQUENCE codigos_barras_seq")
    op.create_table(
        'codigos_barras_anteriores',
        sa.Column('sku_id', sa.Integer(), sa.ForeignKey('sku.id'), primary_key=True),
        sa.Column('anterior', sa.String(), nullable=True),
        sa.Column('nuevo', sa.String(), nullable=False),
        sa.Column('cambiado_en', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    conexion = op.get_bind()
    variantes = conexion.execute(sa.text("SELECT id, barcode FROM sku ORDER BY id")).fetchall()
    for n, (sku_id, anterior) in enumerate(variantes, start=1):
        conexion.execute(
            sa.text("INSERT INTO codigos_barras_anteriores (sku_id, anterior, nuevo) VALUES (:i, :a, :n)"),
            {"i": sku_id, "a": anterior, "n": _codigo(n)},
        )
    # Primero se vacían y después se asignan: un código nuevo podría ser igual
    # al anterior de otra variante, y el índice único no lo dejaría pasar.
    op.execute("UPDATE sku SET barcode = NULL")
    op.execute("UPDATE sku SET barcode = a.nuevo FROM codigos_barras_anteriores a WHERE a.sku_id = sku.id")
    op.execute(f"SELECT setval('codigos_barras_seq', {len(variantes) + 1}, false)")


def downgrade() -> None:
    op.execute("UPDATE sku SET barcode = NULL WHERE id IN (SELECT sku_id FROM codigos_barras_anteriores)")
    op.execute("UPDATE sku SET barcode = a.anterior FROM codigos_barras_anteriores a WHERE a.sku_id = sku.id")
    op.drop_table('codigos_barras_anteriores')
    op.execute("DROP SEQUENCE codigos_barras_seq")
