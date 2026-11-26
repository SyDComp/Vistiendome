"""Las prendas a medida apuntan a sus características y opciones por identidad

Revision ID: f1d7a3b9c524
Revises: e9b2c6d4a183
Create Date: 2026-11-25 00:00:00.000000

Las prendas a medida de los pedidos (cotizacion_items), sus líneas en las
órdenes de corte (orden_corte_items) y las piezas únicas (piezas_unicas)
guardaban sus características como texto: config_custom / config, y
config_propuesta. Pasan a tablas de enlaces:

  · <dueño>_opcion: la opción de la biblioteca, por identidad.
  · <dueño>_propuesta: lo que la clienta pidió y no existía; la característica
    por identidad, el valor como texto (es justamente lo que no existe).

Mismas reglas que con las variantes (c7d2e9f4a816), para que no se pierda nada:
  · CUELLO es ESCOTE, si CUELLO ya no está en la biblioteca y ESCOTE sí.
  · Una característica que no existe se agrega a la biblioteca, anotado.
  · Un valor elegido que no es una opción queda como propuesta, anotado: no
    estaba en el catálogo, que es lo que significa proponer.
  · Lo propuesto en la misma característica reemplaza a lo elegido, como al leer.

Escrita a mano a propósito: en la base hay un tipo `estadocotizacion` viejo
que la autogeneración intentaría reconciliar.
"""
import json
import logging
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'f1d7a3b9c524'
down_revision: Union[str, Sequence[str], None] = 'e9b2c6d4a183'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

registro = logging.getLogger("alembic.prendas_a_medida")

RENOMBRADAS = {"CUELLO": "ESCOTE"}

# (tabla dueña, columna elegida, columna propuesta, tabla de opciones, tabla de propuestas, columna id, qué es)
DUENOS = [
    ("cotizacion_items", "config_custom", "config_propuesta", "cotizacion_item_opcion", "cotizacion_item_propuesta", "item_id", "prenda de pedido"),
    ("orden_corte_items", "config_custom", "config_propuesta", "orden_corte_item_opcion", "orden_corte_item_propuesta", "item_id", "línea de corte"),
    ("piezas_unicas", "config", "config_propuesta", "pieza_opcion", "pieza_propuesta", "pieza_id", "pieza única"),
]


def _avisar(texto):
    registro.warning(texto)
    print(f"[prendas_a_medida] {texto}")


def _json(valor):
    if isinstance(valor, str):
        return json.loads(valor) if valor else {}
    return valor or {}


class _Biblioteca:
    def __init__(self, c):
        self.c = c
        self.car = {n: i for i, n in c.execute(sa.text("SELECT id, name FROM attribute")).fetchall()}
        self.opc = {}
        for oid, cid, valor in c.execute(sa.text("SELECT id, caracteristica_id, valor FROM opcion_caracteristica")).fetchall():
            self.opc[(cid, valor.lower())] = oid

    def caracteristica(self, nombre, donde):
        nombre = str(nombre).strip().upper()
        if nombre not in self.car and RENOMBRADAS.get(nombre) in self.car:
            nombre = RENOMBRADAS[nombre]
        if nombre not in self.car:
            orden = (self.c.execute(sa.text("SELECT COALESCE(MAX(orden), 0) FROM attribute")).scalar() or 0) + 1
            self.car[nombre] = self.c.execute(sa.text(
                "INSERT INTO attribute (name, is_filterable, afecta_apariencia, en_orden_corte, orden, is_system, value_structure) "
                "VALUES (:n, true, false, true, :o, false, CAST('[]' AS JSON)) RETURNING id"), {"n": nombre, "o": orden}).scalar()
            _avisar(f"La característica '{nombre}' no estaba en la biblioteca y se agregó ({donde}).")
        return self.car[nombre]


def upgrade() -> None:
    for _, _, _, t_opc, t_prop, col, _ in DUENOS:
        duena = {"item_id": {"cotizacion_item_opcion": "cotizacion_items", "orden_corte_item_opcion": "orden_corte_items",
                             "cotizacion_item_propuesta": "cotizacion_items", "orden_corte_item_propuesta": "orden_corte_items"},
                 "pieza_id": {"pieza_opcion": "piezas_unicas", "pieza_propuesta": "piezas_unicas"}}[col]
        op.create_table(
            t_opc,
            sa.Column(col, sa.String(26), sa.ForeignKey(f"{duena[t_opc]}.id"), primary_key=True),
            sa.Column("caracteristica_id", sa.Integer(), sa.ForeignKey("attribute.id"), primary_key=True),
            sa.Column("opcion_id", sa.Integer(), nullable=False, index=True),
            sa.ForeignKeyConstraint(["opcion_id", "caracteristica_id"],
                                    ["opcion_caracteristica.id", "opcion_caracteristica.caracteristica_id"],
                                    name=f"{t_opc}_de_su_caracteristica"),
        )
        op.create_table(
            t_prop,
            sa.Column(col, sa.String(26), sa.ForeignKey(f"{duena[t_prop]}.id"), primary_key=True),
            sa.Column("caracteristica_id", sa.Integer(), sa.ForeignKey("attribute.id"), primary_key=True),
            sa.Column("valor", sa.String(120), nullable=False),
        )

    c = op.get_bind()
    libro = _Biblioteca(c)
    for tabla, col_elegida, col_propuesta, t_opc, t_prop, col, que in DUENOS:
        for fila_id, elegido, propuesto in c.execute(sa.text(
                f"SELECT id, {col_elegida}, {col_propuesta} FROM {tabla} ORDER BY id")).fetchall():
            donde = f"{que} {fila_id}"
            opciones, propuestas = {}, {}
            for nombre, valor in _json(elegido).items():
                valor = str(valor or "").strip()
                if not valor:
                    continue
                cid = libro.caracteristica(nombre, donde)
                oid = libro.opc.get((cid, valor.lower()))
                if oid:
                    opciones[cid] = oid
                else:
                    propuestas[cid] = valor
                    _avisar(f"'{valor}' ({nombre}) de la {donde} no es una opción del catálogo: queda como propuesta.")
            for nombre, valor in _json(propuesto).items():
                valor = str(valor or "").strip()
                if not valor:
                    continue
                cid = libro.caracteristica(nombre, donde)
                opciones.pop(cid, None)
                propuestas[cid] = valor[:120]
            for cid, oid in opciones.items():
                c.execute(sa.text(f"INSERT INTO {t_opc} ({col}, caracteristica_id, opcion_id) VALUES (:f, :c, :o)"),
                          {"f": fila_id, "c": cid, "o": oid})
            for cid, valor in propuestas.items():
                c.execute(sa.text(f"INSERT INTO {t_prop} ({col}, caracteristica_id, valor) VALUES (:f, :c, :v)"),
                          {"f": fila_id, "c": cid, "v": valor})
        op.drop_column(tabla, col_elegida)
        op.drop_column(tabla, col_propuesta)


def downgrade() -> None:
    c = op.get_bind()
    nombres = dict(c.execute(sa.text("SELECT id, name FROM attribute")).fetchall())
    valores = dict(c.execute(sa.text("SELECT id, valor FROM opcion_caracteristica")).fetchall())
    for tabla, col_elegida, col_propuesta, t_opc, t_prop, col, _ in DUENOS:
        op.add_column(tabla, sa.Column(col_elegida, sa.JSON(), nullable=True))
        op.add_column(tabla, sa.Column(col_propuesta, sa.JSON(), nullable=True))
        elegidos, propuestos = {}, {}
        for fid, cid, oid in c.execute(sa.text(f"SELECT {col}, caracteristica_id, opcion_id FROM {t_opc}")).fetchall():
            elegidos.setdefault(fid, {})[nombres[cid]] = valores[oid]
        for fid, cid, valor in c.execute(sa.text(f"SELECT {col}, caracteristica_id, valor FROM {t_prop}")).fetchall():
            propuestos.setdefault(fid, {})[nombres[cid]] = valor
        vacio = "{}" if tabla == "piezas_unicas" else None
        for (fid,) in c.execute(sa.text(f"SELECT id FROM {tabla}")).fetchall():
            e, p = elegidos.get(fid), propuestos.get(fid)
            c.execute(sa.text(f"UPDATE {tabla} SET {col_elegida} = CAST(:e AS JSON), {col_propuesta} = CAST(:p AS JSON) WHERE id = :i"),
                      {"e": json.dumps(e) if e else vacio, "p": json.dumps(p) if p else vacio, "i": fid})
        op.drop_table(t_prop)
        op.drop_table(t_opc)
