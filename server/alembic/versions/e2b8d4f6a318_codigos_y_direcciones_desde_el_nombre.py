"""La dirección y los códigos de variante salen del nombre del producto

Revision ID: e2b8d4f6a318
Revises: d1a9c3e5f207
Create Date: 2026-11-06 00:00:00.000000

  · product.slug: pr- y el nombre (core/direccion_producto.py).
  · sku.sku: la dirección y los valores (core/codigos_variante.py).
  · tablas direcciones_anteriores y codigos_variante_anteriores: lo que había
    antes; la vuelta atrás lo restaura.
  · analytics_event.sku y extras.preview_carousel: también guardan el código.

El catálogo tenía tres esquemas distintos (MAG-TAP_MAG_IN-..., NOE-VES_NOE-...,
PR-VESTIDITO-...) y los códigos no seguían al nombre: un producto renombrado
"vestido perla" seguía en PR-VESTIDITO (decisión del usuario 2026-11-06). No
cambia nada de lo que identifica a una variante: pedidos y bodega usan su id, y
la pistola, el código de barras.

Escrita a mano a propósito: en la base hay un tipo `estadocotizacion` viejo
que la autogeneración intentaría reconciliar.
"""
import json
import re
import unicodedata
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e2b8d4f6a318'
down_revision: Union[str, Sequence[str], None] = 'd1a9c3e5f207'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Copia de core/ a propósito: una migración no debe cambiar de resultado si
# mañana cambia el código de la aplicación.
def _slugify(texto) -> str:
    texto = unicodedata.normalize("NFKD", str(texto or "")).encode("ascii", "ignore").decode("utf-8").lower()
    texto = re.sub(r"[^a-z0-9\s-]", "", texto)
    return re.sub(r"[\s-]+", "_", texto).strip("_")


def _libre(base: str, usados: set) -> str:
    if base not in usados:
        return base
    n = 2
    while f"{base}_{n}" in usados:
        n += 1
    return f"{base}_{n}"


def _dict(valor) -> dict:
    if isinstance(valor, str):
        return json.loads(valor) if valor else {}
    return valor or {}


def _codigo(direccion: str, config: dict) -> str:
    valores = (_slugify(config[k]) for k in sorted(config, key=str.upper))
    return "-".join(p for p in (direccion, *valores) if p).upper()


def _crear_tablas() -> None:
    op.create_table(
        'direcciones_anteriores',
        sa.Column('product_id', sa.Integer(), primary_key=True),
        sa.Column('anterior', sa.String(), nullable=False),
        sa.Column('nueva', sa.String(), nullable=False),
    )
    op.create_table(
        'codigos_variante_anteriores',
        sa.Column('sku_id', sa.Integer(), primary_key=True),
        sa.Column('anterior', sa.String(), nullable=False, index=True),
        sa.Column('nuevo', sa.String(), nullable=False, index=True),
        sa.Column('cambiado_en', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def _cambiar_carruseles(conexion, mapa: dict) -> None:
    filas = conexion.execute(sa.text("SELECT id, extras FROM product")).fetchall()
    for producto_id, extras in filas:
        extras = _dict(extras)
        carrusel = extras.get("preview_carousel") or []
        cambio = False
        for foto in carrusel:
            if isinstance(foto, dict) and foto.get("sku") in mapa:
                foto["sku"] = mapa[foto["sku"]]
                cambio = True
        if cambio:
            conexion.execute(sa.text("UPDATE product SET extras = CAST(:e AS JSONB) WHERE id = :i"),
                             {"e": json.dumps(extras), "i": producto_id})


def upgrade() -> None:
    _crear_tablas()
    conexion = op.get_bind()

    usadas, direcciones = set(), {}
    # Las activas primero: la dirección limpia es de la que se vende.
    productos = conexion.execute(sa.text(
        "SELECT id, name, slug FROM product ORDER BY is_deleted, id")).fetchall()
    for producto_id, nombre, anterior in productos:
        nueva = _libre(f"pr-{_slugify(nombre) or 'producto'}", usadas)
        usadas.add(nueva)
        direcciones[producto_id] = nueva
        conexion.execute(
            sa.text("INSERT INTO direcciones_anteriores (product_id, anterior, nueva) VALUES (:i, :a, :n)"),
            {"i": producto_id, "a": anterior, "n": nueva})
    # Primero se liberan y después se asignan: la nueva de uno podría ser la de otro.
    conexion.execute(sa.text("UPDATE product SET slug = '__' || id"))
    conexion.execute(sa.text(
        "UPDATE product p SET slug = d.nueva FROM direcciones_anteriores d WHERE d.product_id = p.id"))

    usados, mapa = set(), {}
    variantes = conexion.execute(sa.text(
        "SELECT id, product_id, sku, config FROM sku ORDER BY is_deleted, id")).fetchall()
    for sku_id, producto_id, anterior, config in variantes:
        nuevo = _libre(_codigo(direcciones[producto_id], _dict(config)), usados)
        usados.add(nuevo)
        mapa[anterior] = nuevo
        conexion.execute(
            sa.text("INSERT INTO codigos_variante_anteriores (sku_id, anterior, nuevo) VALUES (:i, :a, :n)"),
            {"i": sku_id, "a": anterior, "n": nuevo})
    conexion.execute(sa.text("UPDATE sku SET sku = '__' || id"))
    conexion.execute(sa.text(
        "UPDATE sku s SET sku = c.nuevo FROM codigos_variante_anteriores c WHERE c.sku_id = s.id"))

    conexion.execute(sa.text(
        "UPDATE analytics_event e SET sku = c.nuevo FROM codigos_variante_anteriores c WHERE e.sku = c.anterior"))
    _cambiar_carruseles(conexion, mapa)


def downgrade() -> None:
    conexion = op.get_bind()
    conexion.execute(sa.text("UPDATE sku SET sku = '__' || id"))
    conexion.execute(sa.text(
        "UPDATE sku s SET sku = c.anterior FROM codigos_variante_anteriores c WHERE c.sku_id = s.id"))
    conexion.execute(sa.text(
        "UPDATE analytics_event e SET sku = c.anterior FROM codigos_variante_anteriores c WHERE e.sku = c.nuevo"))
    mapa = dict(conexion.execute(sa.text("SELECT nuevo, anterior FROM codigos_variante_anteriores")).fetchall())
    _cambiar_carruseles(conexion, mapa)
    conexion.execute(sa.text("UPDATE product SET slug = '__' || id"))
    conexion.execute(sa.text(
        "UPDATE product p SET slug = d.anterior FROM direcciones_anteriores d WHERE d.product_id = p.id"))
    op.drop_table('codigos_variante_anteriores')
    op.drop_table('direcciones_anteriores')
