"""Los movimientos de bodega y las estadísticas apuntan por identidad

Revision ID: b6f4d2a8e391
Revises: a3c8e5f2b716
Create Date: 2026-11-25 00:00:00.000000

  · stockmovement.reference_id era un solo texto con tres cosas distintas: el
    id de la prenda de un pedido, el de la línea de una orden de corte, o el
    identificador de una operación en bloque (un conteo). Pasa a:
      cotizacion_item_id (llave foránea), orden_corte_item_id (llave foránea)
      y lote (texto: agrupa una operación, no apunta a otra fila).
    Un id que ya no es de ninguna prenda ni línea (una orden que se borró)
    queda como lote, anotado: no se pierde.
  · analytics_event.sku (el código de la variante) → sku_id, con llave
    foránea; al borrar la variante el evento queda sin ella. Si el código
    cambiaba al renombrar el producto, las cifras se partían en dos. Un código
    que ya no es de ninguna variante se busca en los códigos anteriores
    (codigos_variante_anteriores); si tampoco está, el evento queda sin
    variante, anotado.
  · analytics_event.product_id: llave foránea; el que no es de ningún
    producto queda vacío, anotado.

Escrita a mano a propósito: en la base hay un tipo `estadocotizacion` viejo
que la autogeneración intentaría reconciliar.
"""
import logging
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'b6f4d2a8e391'
down_revision: Union[str, Sequence[str], None] = 'a3c8e5f2b716'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

registro = logging.getLogger("alembic.movimientos_y_estadisticas")


def _avisar(texto):
    registro.warning(texto)
    print(f"[movimientos_y_estadisticas] {texto}")


def upgrade() -> None:
    op.add_column("stockmovement", sa.Column("cotizacion_item_id", sa.String(26), sa.ForeignKey("cotizacion_items.id"), nullable=True))
    op.add_column("stockmovement", sa.Column("orden_corte_item_id", sa.String(26), sa.ForeignKey("orden_corte_items.id"), nullable=True))
    op.add_column("stockmovement", sa.Column("lote", sa.String(40), nullable=True))
    c = op.get_bind()
    c.execute(sa.text("UPDATE stockmovement SET cotizacion_item_id = reference_id "
                      "WHERE reference_id IN (SELECT id FROM cotizacion_items)"))
    c.execute(sa.text("UPDATE stockmovement SET orden_corte_item_id = reference_id "
                      "WHERE cotizacion_item_id IS NULL AND reference_id IN (SELECT id FROM orden_corte_items)"))
    c.execute(sa.text("UPDATE stockmovement SET lote = reference_id "
                      "WHERE reference_id IS NOT NULL AND cotizacion_item_id IS NULL AND orden_corte_item_id IS NULL"))
    # Los lotes de bodega son "lote-…" (core/bodega/referencia.py); lo demás es un id huérfano.
    huerfanos = c.execute(sa.text(
        "SELECT count(*) FROM stockmovement WHERE lote IS NOT NULL AND lote NOT LIKE 'lote-%'")).scalar()
    if huerfanos:
        _avisar(f"{huerfanos} movimiento(s) apuntaban a una prenda o línea que ya no existe: quedan con ese id como lote.")
    op.create_index("ix_stockmovement_cotizacion_item_id", "stockmovement", ["cotizacion_item_id"])
    op.create_index("ix_stockmovement_orden_corte_item_id", "stockmovement", ["orden_corte_item_id"])
    op.create_index("ix_stockmovement_lote", "stockmovement", ["lote"])
    op.drop_column("stockmovement", "reference_id")

    op.add_column("analytics_event", sa.Column("sku_id", sa.Integer(),
                                               sa.ForeignKey("sku.id", ondelete="SET NULL"), nullable=True))
    c.execute(sa.text("UPDATE analytics_event e SET sku_id = s.id FROM sku s WHERE s.sku = e.sku"))
    c.execute(sa.text("UPDATE analytics_event e SET sku_id = a.sku_id FROM codigos_variante_anteriores a "
                      "WHERE e.sku_id IS NULL AND e.sku = a.anterior"))
    sin = c.execute(sa.text("SELECT count(*) FROM analytics_event WHERE sku IS NOT NULL AND sku_id IS NULL")).scalar()
    if sin:
        _avisar(f"{sin} evento(s) nombraban un código que no es de ninguna variante: quedan sin variante.")
    sin_prod = c.execute(sa.text(
        "SELECT count(*) FROM analytics_event e WHERE e.product_id IS NOT NULL "
        "AND NOT EXISTS (SELECT 1 FROM product p WHERE p.id = e.product_id)")).scalar()
    if sin_prod:
        _avisar(f"{sin_prod} evento(s) nombraban un producto que no existe: quedan sin producto.")
        c.execute(sa.text("UPDATE analytics_event e SET product_id = NULL WHERE e.product_id IS NOT NULL "
                          "AND NOT EXISTS (SELECT 1 FROM product p WHERE p.id = e.product_id)"))
    op.create_foreign_key("analytics_event_product_id_fkey", "analytics_event", "product",
                          ["product_id"], ["id"], ondelete="SET NULL")
    op.create_index("ix_analytics_event_sku_id", "analytics_event", ["sku_id"])
    op.drop_index("ix_analytics_event_sku", table_name="analytics_event")
    op.drop_column("analytics_event", "sku")


def downgrade() -> None:
    op.add_column("analytics_event", sa.Column("sku", sa.String(), nullable=True))
    op.execute("UPDATE analytics_event e SET sku = s.sku FROM sku s WHERE s.id = e.sku_id")
    op.create_index("ix_analytics_event_sku", "analytics_event", ["sku"])
    op.drop_index("ix_analytics_event_sku_id", table_name="analytics_event")
    op.drop_constraint("analytics_event_product_id_fkey", "analytics_event", type_="foreignkey")
    op.drop_column("analytics_event", "sku_id")

    op.add_column("stockmovement", sa.Column("reference_id", sa.String(), nullable=True))
    op.execute("UPDATE stockmovement SET reference_id = COALESCE(cotizacion_item_id, orden_corte_item_id, lote)")
    for col in ("lote", "orden_corte_item_id", "cotizacion_item_id"):
        op.drop_index(f"ix_stockmovement_{col}", table_name="stockmovement")
        op.drop_column("stockmovement", col)
