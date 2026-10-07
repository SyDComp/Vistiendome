"""Historia del pedido, "¿Cómo llegó?" y Ajustes del negocio

Revision ID: b7d41c9e2a58
Revises: e1a74fb40f73
Create Date: 2026-10-07 00:00:00.000000

- pedido_eventos: lo que le pasa a cada pedido, con quién y cuándo. Solo se
  agregan filas.
- cotizaciones.canal: cómo llegó un pedido cargado en el panel.
- ajustes_negocio: ajustes privados del negocio (no se publican al sitio).

LOS PEDIDOS QUE YA EXISTEN
No se inventa nada. Cada uno recibe dos anotaciones, las dos con hechos que se
conocen:
  · CREADO, con su fecha real de creación. Los de la web los creó el sitio
    web; de los manuales no quedó registrado quién los cargó, y así se dice.
  · REGISTRO_INICIADO, con la foto de cómo estaba al empezar a anotar: estado,
    prendas, cuántas cortadas y en qué órdenes. Lo que pasó entre una cosa y
    la otra no quedó escrito, y no se reconstruye.

Escrita a mano a propósito: en la base hay un tipo `estadocotizacion` viejo
que la autogeneración intentaría reconciliar. Y no importa código de la app:
una migración tiene que seguir funcionando aunque la app cambie después.
"""
import json
from datetime import datetime, timezone
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import ulid

# revision identifiers, used by Alembic.
revision: str = 'b7d41c9e2a58'
down_revision: Union[str, Sequence[str], None] = 'e1a74fb40f73'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('cotizaciones', sa.Column('canal', sa.String(length=60), nullable=True))

    op.create_table(
        'ajustes_negocio',
        sa.Column('clave', sa.String(length=60), primary_key=True),
        sa.Column('valor', sa.JSON(), nullable=True),
        sa.Column('actualizado_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        'pedido_eventos',
        sa.Column('id', sa.String(length=26), primary_key=True),
        sa.Column('cotizacion_id', sa.String(length=26),
                  sa.ForeignKey('cotizaciones.id', ondelete='SET NULL'), nullable=True),
        sa.Column('numero_pedido', sa.Integer(), nullable=True),
        sa.Column('tipo', sa.String(length=40), nullable=False),
        sa.Column('datos', sa.JSON(), nullable=False),
        sa.Column('actor_cuenta_id', sa.String(length=26), nullable=True),
        sa.Column('actor_nombre', sa.String(length=120), nullable=True),
        sa.Column('ocurrido_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_pedido_eventos_cotizacion_id', 'pedido_eventos', ['cotizacion_id'])
    op.create_index('ix_pedido_eventos_numero_pedido', 'pedido_eventos', ['numero_pedido'])
    op.create_index('ix_pedido_eventos_ocurrido_at', 'pedido_eventos', ['ocurrido_at'])

    _historia_de_lo_existente(op.get_bind())


def _historia_de_lo_existente(conexion) -> None:
    ahora = datetime.now(timezone.utc)
    pedidos = conexion.execute(sa.text(
        "SELECT id, numero, origen, estado, created_at FROM cotizaciones ORDER BY created_at"
    )).all()
    insertar = sa.text(
        "INSERT INTO pedido_eventos (id, cotizacion_id, numero_pedido, tipo, datos, actor_cuenta_id, actor_nombre, ocurrido_at) "
        "VALUES (:id, :cotizacion_id, :numero, :tipo, CAST(:datos AS json), NULL, :actor, :cuando)"
    )
    for p in pedidos:
        # created_at se guardó sin zona y en UTC (datetime.utcnow).
        creado = p.created_at.replace(tzinfo=timezone.utc) if p.created_at.tzinfo is None else p.created_at
        web = p.origen != 'MANUAL'
        conexion.execute(insertar, {
            "id": str(ulid.ULID()), "cotizacion_id": p.id, "numero": p.numero, "tipo": "CREADO",
            "datos": json.dumps({"origen": p.origen, "canal": None, "anterior_al_registro": True}),
            "actor": "Sitio web" if web else None, "cuando": creado,
        })

        piezas, cortadas = conexion.execute(sa.text(
            "SELECT count(*) FILTER (WHERE sku_id IS NOT NULL), "
            "       count(*) FILTER (WHERE sku_id IS NOT NULL AND cortado) "
            "FROM cotizacion_items WHERE cotizacion_id = :id"
        ), {"id": p.id}).one()
        ordenes = [fila.numero for fila in conexion.execute(sa.text(
            "SELECT DISTINCT o.numero FROM ordenes_corte o "
            "JOIN orden_corte_items oi ON oi.orden_id = o.id "
            "JOIN cotizacion_items ci ON ci.id = oi.cotizacion_item_id "
            "WHERE ci.cotizacion_id = :id ORDER BY o.numero"
        ), {"id": p.id}).all()]
        conexion.execute(insertar, {
            "id": str(ulid.ULID()), "cotizacion_id": p.id, "numero": p.numero, "tipo": "REGISTRO_INICIADO",
            "datos": json.dumps({"estado": p.estado, "piezas": piezas, "cortadas": cortadas, "ordenes": ordenes}),
            "actor": None, "cuando": ahora,
        })


def downgrade() -> None:
    op.drop_index('ix_pedido_eventos_ocurrido_at', table_name='pedido_eventos')
    op.drop_index('ix_pedido_eventos_numero_pedido', table_name='pedido_eventos')
    op.drop_index('ix_pedido_eventos_cotizacion_id', table_name='pedido_eventos')
    op.drop_table('pedido_eventos')
    op.drop_table('ajustes_negocio')
    op.drop_column('cotizaciones', 'canal')
