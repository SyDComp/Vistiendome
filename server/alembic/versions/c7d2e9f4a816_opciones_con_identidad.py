"""Las opciones con identidad: variantes, especificaciones y tramos les apuntan por id

Revision ID: c7d2e9f4a816
Revises: b5e1a7c9d642
Create Date: 2026-11-25 00:00:00.000000

POR QUÉ
Cada variante guardaba sus características como texto ({"CUELLO": "Redondo"})
y la biblioteca, sus opciones como una lista de textos. Al renombrar CUELLO a
ESCOTE en el panel (2026-11-25), 764 variantes siguieron diciendo CUELLO: el
nombre vivía copiado en cada una. Lo mismo las especificaciones (opciones
permitidas por texto) y los precios por cantidad (característica y rango por
nombre, en un ajuste JSON).

QUÉ HACE
  · opcion_caracteristica: cada opción de cada característica, con su id.
    Sale de attribute.domain, en su orden y con sus datos (hex, imagen...).
  · sku_opcion: qué opción tiene cada variante en cada característica. Sale
    de sku.config, también de las dadas de baja (su historia les apunta).
  · especificacion_opcion: las opciones permitidas de cada especificación.
  · tramo_precio y tramo_producto: los precios por cantidad, desde el ajuste
    price_tiers, que se borra.
  · Se quitan sku.config, attribute.domain y
    specificationcharacteristiclink.allowed_values: ahora se calculan.

NO SE PIERDE NADA
  · CUELLO es ESCOTE: el renombre fue a propósito (decisión del usuario
    2026-11-25), y ESCOTE ya tiene las mismas opciones.
  · Cualquier otra característica u opción que esté escrita en una variante,
    una especificación o un tramo y no exista en la biblioteca SE AGREGA a la
    biblioteca, y queda anotada en el registro de la migración. No se adivina
    qué quiso decir ni se descarta.
  · Un valor vacío ("MATERIAL": "") no es una opción: esa variante queda sin
    esa característica. Queda anotado.
  · Una opción repetida en la biblioteca (había dos "Morado") queda una sola,
    con los datos que puso la tienda (decisión del usuario 2026-11-25).
  · Una especificación que permitía una opción que no existe ("Negro
    Fuerte") la deja de permitir; no se crea (decisión del usuario 2026-11-25).

La vuelta atrás reconstruye el texto desde los enlaces.

Escrita a mano a propósito: en la base hay un tipo `estadocotizacion` viejo
que la autogeneración intentaría reconciliar.
"""
import json
import logging
from typing import Dict, Sequence, Tuple, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'c7d2e9f4a816'
down_revision: Union[str, Sequence[str], None] = 'b5e1a7c9d642'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

registro = logging.getLogger("alembic.opciones_con_identidad")

# Características que la tienda renombró a propósito y que las variantes todavía nombran por el nombre viejo.
RENOMBRADAS = {"CUELLO": "ESCOTE"}

_PROPIAS = {"id", "value", "order", "is_system"}


def _json(valor, vacio):
    if isinstance(valor, str):
        return json.loads(valor) if valor else vacio
    return valor if valor is not None else vacio


def _avisar(texto):
    registro.warning(texto)
    print(f"[opciones_con_identidad] {texto}")


class _Biblioteca:
    """Las características y opciones ya migradas, y las que haya que agregar."""

    def __init__(self, conexion):
        self.c = conexion
        self.caracteristicas: Dict[str, int] = {}
        self.opciones: Dict[Tuple[int, str], int] = {}
        self.orden: Dict[int, int] = {}
        self.renombres: Dict[Tuple[str, str], int] = {}

    def opcion(self, valor: str, caracteristica_id: int, datos=None, es_sistema=False, orden=None) -> int:
        clave = (caracteristica_id, valor)
        if clave in self.opciones:
            return self.opciones[clave]
        if orden is None:
            orden = self.orden.get(caracteristica_id, 0) + 1
        self.orden[caracteristica_id] = max(orden, self.orden.get(caracteristica_id, 0))
        nuevo = self.c.execute(sa.text(
            "INSERT INTO opcion_caracteristica (caracteristica_id, valor, orden, es_sistema, datos) "
            "VALUES (:c, :v, :o, :s, CAST(:d AS JSON)) RETURNING id"
        ), {"c": caracteristica_id, "v": valor, "o": orden, "s": es_sistema, "d": json.dumps(datos or {})}).scalar()
        self.opciones[clave] = nuevo
        return nuevo

    def caracteristica(self, nombre: str, donde: str) -> int:
        # El nombre viejo solo se lleva al nuevo si el viejo ya no está en la
        # biblioteca y el nuevo sí: en una base donde CUELLO siga existiendo,
        # CUELLO es CUELLO.
        if nombre not in self.caracteristicas and RENOMBRADAS.get(nombre) in self.caracteristicas:
            clave = (nombre, RENOMBRADAS[nombre])
            self.renombres[clave] = self.renombres.get(clave, 0) + 1
            nombre = RENOMBRADAS[nombre]
        if nombre not in self.caracteristicas:
            orden = (self.c.execute(sa.text("SELECT COALESCE(MAX(orden), 0) FROM attribute")).scalar() or 0) + 1
            nuevo = self.c.execute(sa.text(
                "INSERT INTO attribute (name, is_filterable, afecta_apariencia, en_orden_corte, orden, is_system, value_structure, domain) "
                "VALUES (:n, true, false, true, :o, false, CAST('[]' AS JSON), CAST('[]' AS JSON)) RETURNING id"
            ), {"n": nombre, "o": orden}).scalar()
            self.caracteristicas[nombre] = nuevo
            _avisar(f"La característica '{nombre}' no estaba en la biblioteca y se agregó ({donde}).")
        return self.caracteristicas[nombre]

    def opcion_de(self, nombre: str, valor: str, donde: str) -> int:
        """La opción `valor` de la característica `nombre`; si no existe, se agrega y se avisa."""
        caracteristica_id = self.caracteristica(nombre, donde)
        if (caracteristica_id, valor) not in self.opciones:
            # Mismas palabras con otras mayúsculas: es esa opción.
            for (cid, v), oid in self.opciones.items():
                if cid == caracteristica_id and v.lower() == valor.lower():
                    return oid
            _avisar(f"'{valor}' no era una opción de {RENOMBRADAS.get(nombre, nombre)} y se agregó ({donde}).")
        return self.opcion(valor, caracteristica_id)


def upgrade() -> None:
    op.create_table(
        "opcion_caracteristica",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("caracteristica_id", sa.Integer(), sa.ForeignKey("attribute.id"), nullable=False),
        sa.Column("valor", sa.String(), nullable=False),
        sa.Column("orden", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("es_sistema", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("datos", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.UniqueConstraint("caracteristica_id", "valor", name="opcion_unica_en_su_caracteristica"),
        sa.UniqueConstraint("id", "caracteristica_id", name="opcion_con_su_caracteristica"),
    )
    op.create_index("ix_opcion_caracteristica_caracteristica_id", "opcion_caracteristica", ["caracteristica_id"])

    op.create_table(
        "sku_opcion",
        sa.Column("sku_id", sa.Integer(), sa.ForeignKey("sku.id"), primary_key=True),
        sa.Column("caracteristica_id", sa.Integer(), sa.ForeignKey("attribute.id"), primary_key=True),
        sa.Column("opcion_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["opcion_id", "caracteristica_id"],
                                ["opcion_caracteristica.id", "opcion_caracteristica.caracteristica_id"],
                                name="sku_opcion_de_su_caracteristica"),
    )
    op.create_index("ix_sku_opcion_opcion_id", "sku_opcion", ["opcion_id"])

    op.create_table(
        "especificacion_opcion",
        sa.Column("specification_id", sa.Integer(), sa.ForeignKey("specification.id"), primary_key=True),
        sa.Column("caracteristica_id", sa.Integer(), sa.ForeignKey("attribute.id"), primary_key=True),
        sa.Column("opcion_id", sa.Integer(), primary_key=True),
        sa.ForeignKeyConstraint(["opcion_id", "caracteristica_id"],
                                ["opcion_caracteristica.id", "opcion_caracteristica.caracteristica_id"],
                                name="especificacion_opcion_de_su_caracteristica"),
    )

    op.create_table(
        "tramo_precio",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("orden", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("nombre", sa.String(), nullable=False, server_default=""),
        sa.Column("caracteristica_id", sa.Integer(), sa.ForeignKey("attribute.id"), nullable=True),
        sa.Column("desde_opcion_id", sa.Integer(), sa.ForeignKey("opcion_caracteristica.id"), nullable=True),
        sa.Column("hasta_opcion_id", sa.Integer(), sa.ForeignKey("opcion_caracteristica.id"), nullable=True),
        sa.Column("min_unidades", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("tipo_descuento", sa.String(), nullable=False, server_default="percent"),
        sa.Column("valor_descuento", sa.Float(), nullable=False, server_default="0"),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.create_table(
        "tramo_producto",
        sa.Column("tramo_id", sa.Integer(), sa.ForeignKey("tramo_precio.id"), primary_key=True),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("product.id"), primary_key=True),
    )

    c = op.get_bind()
    libro = _Biblioteca(c)

    # 1. Las opciones de cada característica, en el orden de su lista.
    for car_id, nombre, dominio in c.execute(sa.text("SELECT id, name, domain FROM attribute ORDER BY id")).fetchall():
        libro.caracteristicas[nombre] = car_id
        orden = 0
        for item in _json(dominio, []):
            if not isinstance(item, dict):
                item = {"value": item}
            valor = str(item.get("value") or "").strip()
            if not valor:
                _avisar(f"{nombre} tenía una opción vacía; no es una opción y no se migra.")
                continue
            if (car_id, valor) in libro.opciones:
                # Repetida (pasó con "Morado": la del sistema y otra que agregó la
                # tienda con otro tono). Queda una sola, en el lugar de la primera,
                # con los datos (el tono) que puso la tienda: es lo que ella definió.
                datos = {k: v for k, v in item.items() if k not in _PROPIAS}
                if not item.get("is_system") and datos:
                    c.execute(sa.text("UPDATE opcion_caracteristica SET datos = CAST(:d AS JSON) WHERE id = :i"),
                              {"d": json.dumps(datos), "i": libro.opciones[(car_id, valor)]})
                    _avisar(f"{nombre} tenía la opción '{valor}' repetida; queda una, con los datos que puso la tienda: {datos}.")
                else:
                    _avisar(f"{nombre} tenía la opción '{valor}' repetida; queda una.")
                continue
            orden += 1
            libro.opcion(valor, car_id, datos={k: v for k, v in item.items() if k not in _PROPIAS},
                         es_sistema=bool(item.get("is_system")), orden=orden)

    # 2. Las variantes, también las dadas de baja.
    vacios = 0
    for sku_id, codigo, config in c.execute(sa.text("SELECT id, sku, config FROM sku ORDER BY id")).fetchall():
        for nombre, valor in _json(config, {}).items():
            valor = str(valor or "").strip()
            if not valor:
                vacios += 1
                continue
            opcion_id = libro.opcion_de(str(nombre).strip().upper(), valor, f"variante {codigo}")
            car_id = libro.caracteristica(str(nombre).strip().upper(), f"variante {codigo}")
            existe = c.execute(sa.text("SELECT 1 FROM sku_opcion WHERE sku_id = :s AND caracteristica_id = :c"),
                               {"s": sku_id, "c": car_id}).first()
            if existe:
                _avisar(f"La variante {codigo} tenía dos valores para {RENOMBRADAS.get(nombre, nombre)}; queda el primero.")
                continue
            c.execute(sa.text("INSERT INTO sku_opcion (sku_id, caracteristica_id, opcion_id) VALUES (:s, :c, :o)"),
                      {"s": sku_id, "c": car_id, "o": opcion_id})
    if vacios:
        _avisar(f"{vacios} valor(es) vacío(s) en variantes: esas variantes quedan sin esa característica.")
    for (viejo, nuevo), veces in libro.renombres.items():
        # Cada valor pasa dos veces por aquí (la opción y la característica).
        _avisar(f"{veces // 2} valor(es) de variantes decían {viejo}: quedan en {nuevo}, como se renombró en la biblioteca.")

    # 3. Las opciones permitidas de cada especificación.
    for spec_id, car_id, permitidas in c.execute(sa.text(
            "SELECT l.specification_id, l.characteristic_id, l.allowed_values FROM specificationcharacteristiclink l")).fetchall():
        nombre = c.execute(sa.text("SELECT name FROM attribute WHERE id = :i"), {"i": car_id}).scalar()
        for valor in dict.fromkeys(str(v or "").strip() for v in _json(permitidas, [])):
            if not valor:
                continue
            # Una opción permitida que no existe no se crea: la especificación
            # nombraba algo que ya no estaba en la biblioteca (pasó con "Negro Fuerte").
            car_libro = libro.caracteristicas.get(nombre)
            opcion_id = next((oid for (cid, v), oid in libro.opciones.items()
                              if cid == car_libro and v.lower() == valor.lower()), None)
            if opcion_id is None:
                _avisar(f"La especificación {spec_id} permitía '{valor}' en {nombre}, que no existe: se quita de la especificación.")
                continue
            c.execute(sa.text("INSERT INTO especificacion_opcion (specification_id, caracteristica_id, opcion_id) "
                              "VALUES (:s, :c, :o)"), {"s": spec_id, "c": car_id, "o": opcion_id})

    # 4. Los precios por cantidad, del ajuste a sus tablas.
    ajuste = c.execute(sa.text("SELECT value FROM sitesetting WHERE key = 'price_tiers'")).scalar()
    productos = {r[0] for r in c.execute(sa.text("SELECT id FROM product")).fetchall()}
    for orden, t in enumerate((_json(ajuste, {}) or {}).get("tiers") or [], start=1):
        nombre_tramo = str(t.get("name") or "").strip()
        donde = f"precio por cantidad «{nombre_tramo or orden}»"
        car = str(t.get("characteristic") or "").strip().upper()
        car_id = libro.caracteristica(car, donde) if car else None
        rango = {}
        for campo in ("from", "to"):
            v = str(t.get(campo) or "").strip()
            rango[campo] = libro.opcion_de(car, v, donde) if (car and v) else None
        tramo_id = c.execute(sa.text(
            "INSERT INTO tramo_precio (orden, nombre, caracteristica_id, desde_opcion_id, hasta_opcion_id, "
            "min_unidades, tipo_descuento, valor_descuento, activo) "
            "VALUES (:orden, :nombre, :car, :desde, :hasta, :min, :tipo, :valor, :activo) RETURNING id"
        ), {"orden": orden, "nombre": nombre_tramo, "car": car_id, "desde": rango["from"], "hasta": rango["to"],
            "min": int(t.get("min_qty") or 0), "tipo": t.get("discount_type") or "percent",
            "valor": float(t.get("discount_value") or 0), "activo": t.get("active") is not False}).scalar()
        for p in sorted({int(x) for x in (t.get("productos") or [])}):
            if p not in productos:
                _avisar(f"El {donde} nombraba el producto {p}, que no existe; no se migra.")
                continue
            c.execute(sa.text("INSERT INTO tramo_producto (tramo_id, product_id) VALUES (:t, :p)"), {"t": tramo_id, "p": p})
    c.execute(sa.text("DELETE FROM sitesetting WHERE key = 'price_tiers'"))

    # 5. Lo que era copia de texto, fuera: ahora se calcula de los enlaces.
    op.drop_column("sku", "config")
    op.drop_column("attribute", "domain")
    op.drop_column("specificationcharacteristiclink", "allowed_values")


def downgrade() -> None:
    op.add_column("sku", sa.Column("config", sa.JSON(), nullable=True))
    op.add_column("attribute", sa.Column("domain", sa.JSON(), nullable=True))
    op.add_column("specificationcharacteristiclink", sa.Column("allowed_values", sa.JSON(), nullable=True))
    c = op.get_bind()

    nombres = dict(c.execute(sa.text("SELECT id, name FROM attribute")).fetchall())
    opciones = {}
    dominios = {}
    for oid, car_id, valor, orden, es_sistema, datos in c.execute(sa.text(
            "SELECT id, caracteristica_id, valor, orden, es_sistema, datos FROM opcion_caracteristica ORDER BY caracteristica_id, orden, id")).fetchall():
        opciones[oid] = valor
        dominios.setdefault(car_id, []).append({**_json(datos, {}), "value": valor, "order": orden, "is_system": es_sistema})
    for car_id in nombres:
        c.execute(sa.text("UPDATE attribute SET domain = CAST(:d AS JSON) WHERE id = :i"),
                  {"d": json.dumps(dominios.get(car_id, [])), "i": car_id})

    configs = {}
    for sku_id, car_id, oid in c.execute(sa.text("SELECT sku_id, caracteristica_id, opcion_id FROM sku_opcion")).fetchall():
        configs.setdefault(sku_id, {})[nombres[car_id]] = opciones[oid]
    for (sku_id,) in c.execute(sa.text("SELECT id FROM sku")).fetchall():
        c.execute(sa.text("UPDATE sku SET config = CAST(:c AS JSON) WHERE id = :i"),
                  {"c": json.dumps(configs.get(sku_id, {})), "i": sku_id})

    permitidas = {}
    for spec_id, car_id, oid in c.execute(sa.text(
            "SELECT specification_id, caracteristica_id, opcion_id FROM especificacion_opcion")).fetchall():
        permitidas.setdefault((spec_id, car_id), []).append(opciones[oid])
    for spec_id, car_id in c.execute(sa.text(
            "SELECT specification_id, characteristic_id FROM specificationcharacteristiclink")).fetchall():
        c.execute(sa.text("UPDATE specificationcharacteristiclink SET allowed_values = CAST(:v AS JSON) "
                          "WHERE specification_id = :s AND characteristic_id = :c"),
                  {"v": json.dumps(permitidas.get((spec_id, car_id), [])), "s": spec_id, "c": car_id})

    tiers = []
    for tid, nombre, car_id, desde, hasta, minimo, tipo, valor, activo in c.execute(sa.text(
            "SELECT id, nombre, caracteristica_id, desde_opcion_id, hasta_opcion_id, min_unidades, "
            "tipo_descuento, valor_descuento, activo FROM tramo_precio ORDER BY orden, id")).fetchall():
        prods = [str(r[0]) for r in c.execute(sa.text(
            "SELECT product_id FROM tramo_producto WHERE tramo_id = :t ORDER BY product_id"), {"t": tid}).fetchall()]
        tiers.append({"name": nombre, "characteristic": nombres.get(car_id, ""), "from": opciones.get(desde, ""),
                      "to": opciones.get(hasta, ""), "min_qty": minimo, "discount_type": tipo,
                      "discount_value": valor, "active": activo, "productos": prods})
    c.execute(sa.text("INSERT INTO sitesetting (key, value) VALUES ('price_tiers', CAST(:v AS JSON))"),
              {"v": json.dumps({"tiers": tiers})})

    op.drop_table("tramo_producto")
    op.drop_table("tramo_precio")
    op.drop_table("especificacion_opcion")
    op.drop_index("ix_sku_opcion_opcion_id", table_name="sku_opcion")
    op.drop_table("sku_opcion")
    op.drop_index("ix_opcion_caracteristica_caracteristica_id", table_name="opcion_caracteristica")
    op.drop_table("opcion_caracteristica")
