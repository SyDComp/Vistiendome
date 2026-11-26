"""Las promociones apuntan a sus productos; la tabla de colores duplicada se retira

Revision ID: d4a8f1c3e957
Revises: c7d2e9f4a816
Create Date: 2026-11-25 00:00:00.000000

  · promocion y promocion_producto: las promociones, desde el ajuste
    `promotions` (JSON con los productos como números sueltos), que se borra.
    Un producto que ya no existe no se migra, y queda anotado.
  · colorswatch: una segunda lista de colores con su hex, aparte de las
    opciones de COLOR. Solo la usaba una pantalla que no estaba en el menú.
    Los colores que tenga y COLOR no, pasan a COLOR con su hex (anotado); los
    que COLOR ya tiene conservan el hex de COLOR, que es el que se usa. Después
    se borra la tabla.

Escrita a mano a propósito: en la base hay un tipo `estadocotizacion` viejo
que la autogeneración intentaría reconciliar.
"""
import json
import logging
from datetime import date
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'd4a8f1c3e957'
down_revision: Union[str, Sequence[str], None] = 'c7d2e9f4a816'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

registro = logging.getLogger("alembic.promociones_y_colores")


def _avisar(texto):
    registro.warning(texto)
    print(f"[promociones_y_colores] {texto}")


def _json(valor, vacio):
    if isinstance(valor, str):
        return json.loads(valor) if valor else vacio
    return valor if valor is not None else vacio


def _entero(valor):
    try:
        return int(valor or 0)
    except (TypeError, ValueError):
        return 0


def _fecha(valor):
    try:
        return date.fromisoformat(str(valor)[:10]) if valor else None
    except ValueError:
        _avisar(f"'{valor}' no es una fecha; la promoción queda sin esa fecha.")
        return None


def upgrade() -> None:
    op.create_table(
        "promocion",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("orden", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("nombre", sa.String(), nullable=False, server_default=""),
        sa.Column("tipo", sa.String(), nullable=False, server_default="cantidad"),
        sa.Column("lleva", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("paga", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("descuento", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("min_unidades", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("min_monto", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("regalo_texto", sa.String(), nullable=False, server_default=""),
        sa.Column("desde", sa.Date(), nullable=True),
        sa.Column("hasta", sa.Date(), nullable=True),
        sa.Column("combinable", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("activa", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.create_table(
        "promocion_producto",
        sa.Column("promocion_id", sa.Integer(), sa.ForeignKey("promocion.id"), primary_key=True),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("product.id"), primary_key=True),
    )

    c = op.get_bind()
    productos = {r[0] for r in c.execute(sa.text("SELECT id FROM product")).fetchall()}
    ajuste = c.execute(sa.text("SELECT value FROM sitesetting WHERE key = 'promotions'")).scalar()
    for orden, p in enumerate((_json(ajuste, {}) or {}).get("promos") or [], start=1):
        nombre = str(p.get("name") or "").strip()
        pid = c.execute(sa.text(
            "INSERT INTO promocion (orden, nombre, tipo, lleva, paga, descuento, min_unidades, min_monto, "
            "regalo_texto, desde, hasta, combinable, activa) VALUES (:orden, :nombre, :tipo, :lleva, :paga, "
            ":descuento, :min_unidades, :min_monto, :regalo, :desde, :hasta, :combinable, :activa) RETURNING id"
        ), {"orden": orden, "nombre": nombre, "tipo": p.get("type") or "cantidad",
            "lleva": _entero(p.get("lleva")), "paga": _entero(p.get("paga")), "descuento": _entero(p.get("descuento")),
            "min_unidades": _entero(p.get("min_unidades")), "min_monto": _entero(p.get("min_monto")),
            "regalo": str(p.get("regalo_texto") or "").strip(), "desde": _fecha(p.get("desde")),
            "hasta": _fecha(p.get("hasta")), "combinable": bool(p.get("combinable")),
            "activa": p.get("active") is not False}).scalar()
        for prod in sorted({int(x) for x in (p.get("productos") or [])}):
            if prod not in productos:
                _avisar(f"La promoción «{nombre or orden}» nombraba el producto {prod}, que no existe; no se migra.")
                continue
            c.execute(sa.text("INSERT INTO promocion_producto (promocion_id, product_id) VALUES (:p, :x)"),
                      {"p": pid, "x": prod})
    c.execute(sa.text("DELETE FROM sitesetting WHERE key = 'promotions'"))

    # La tabla de colores duplicada: lo que COLOR no tenga, pasa a COLOR.
    color_id = c.execute(sa.text("SELECT id FROM attribute WHERE upper(name) = 'COLOR'")).scalar()
    swatches = c.execute(sa.text("SELECT name, hex_code FROM colorswatch ORDER BY id")).fetchall()
    if swatches and color_id is None:
        _avisar("Había colores en la tabla vieja pero no existe la característica COLOR; no se migran.")
    elif swatches:
        tiene = {str(v).lower() for (v,) in c.execute(sa.text(
            "SELECT valor FROM opcion_caracteristica WHERE caracteristica_id = :c"), {"c": color_id}).fetchall()}
        orden = c.execute(sa.text("SELECT COALESCE(MAX(orden), 0) FROM opcion_caracteristica WHERE caracteristica_id = :c"),
                          {"c": color_id}).scalar() or 0
        for nombre, hex_code in swatches:
            if str(nombre).strip().lower() in tiene:
                continue
            orden += 1
            c.execute(sa.text("INSERT INTO opcion_caracteristica (caracteristica_id, valor, orden, es_sistema, datos) "
                              "VALUES (:c, :v, :o, false, CAST(:d AS JSON))"),
                      {"c": color_id, "v": str(nombre).strip(), "o": orden, "d": json.dumps({"hex_code": hex_code})})
            _avisar(f"El color '{nombre}' estaba solo en la tabla vieja; pasa a COLOR con su hex {hex_code}.")
    op.drop_table("colorswatch")


def downgrade() -> None:
    # La tabla de colores vuelve vacía: sus colores quedaron como opciones de COLOR.
    op.create_table(
        "colorswatch",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False, unique=True, index=True),
        sa.Column("hex_code", sa.String(), nullable=False, server_default="#000000"),
        sa.Column("slug", sa.String(), nullable=False, unique=True, index=True),
    )
    c = op.get_bind()
    promos = []
    for row in c.execute(sa.text(
            "SELECT id, nombre, tipo, lleva, paga, descuento, min_unidades, min_monto, regalo_texto, desde, hasta, "
            "combinable, activa FROM promocion ORDER BY orden, id")).fetchall():
        pid, nombre, tipo, lleva, paga, descuento, min_u, min_m, regalo, desde, hasta, combinable, activa = row
        prods = [str(r[0]) for r in c.execute(sa.text(
            "SELECT product_id FROM promocion_producto WHERE promocion_id = :p ORDER BY product_id"), {"p": pid}).fetchall()]
        promos.append({"name": nombre, "type": tipo, "lleva": lleva, "paga": paga, "descuento": descuento,
                       "min_unidades": min_u, "min_monto": min_m, "regalo_texto": regalo,
                       "desde": desde.isoformat() if desde else "", "hasta": hasta.isoformat() if hasta else "",
                       "combinable": combinable, "active": activa, "productos": prods})
    c.execute(sa.text("INSERT INTO sitesetting (key, value) VALUES ('promotions', CAST(:v AS JSON))"),
              {"v": json.dumps({"promos": promos})})
    op.drop_table("promocion_producto")
    op.drop_table("promocion")
