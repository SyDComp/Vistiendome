"""Canal, medio de pago, envío, comuna y cuentas: por identidad

Revision ID: a3c8e5f2b716
Revises: f1d7a3b9c524
Create Date: 2026-11-25 00:00:00.000000

Las listas que la tienda edita pasan a tablas con identidad, y lo registrado
les apunta en vez de copiar su nombre:

  · canal_pedido  ← ajuste canales_pedido     · cotizaciones.canal → canal_id
  · medio_pago    ← ajuste medios_pago        · pagos.medio → medio_id
  · metodo_envio  ← ajustes shipping_methods y shipping_colors
                    · cotizaciones.transporte → metodo_envio_id
                    · personas.transporte_preferido → metodo_envio_preferido_id
  · cotizaciones.region / comuna (texto) → comuna_id (la región es la de la comuna)
  · arqueos_caja: abierto_por_id / cerrado_por_id; pagos: anulado_por_id; y
    llave foránea en pagos.registrado_por_id y pedido_eventos.actor_cuenta_id.

Lo que el sistema reconoce va por clave, no por nombre: el canal "local" (la
venta en la caja), y los medios "efectivo" y "a_favor" (saldo a favor).

No se pierde nada: un canal, medio o método que algún registro nombra y que ya
no estaba en la lista, entra a la lista DESACTIVADO (no se ofrece, y lo
registrado sigue diciéndolo), anotado. Una comuna que no calza con la lista de
comunas, o un nombre de quien abrió la caja que no calza con ninguna cuenta,
queda anotado en el registro: revisar ANTES de desplegar.

Escrita a mano a propósito: en la base hay un tipo `estadocotizacion` viejo
que la autogeneración intentaría reconciliar.
"""
import json
import logging
import unicodedata
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'a3c8e5f2b716'
down_revision: Union[str, Sequence[str], None] = 'f1d7a3b9c524'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

registro = logging.getLogger("alembic.listas_y_cuentas")

CANALES_DEFECTO = ["WhatsApp", "Instagram", "Facebook", "Llamada", "En la tienda", "Recomendación", "Otro"]
MEDIOS_DEFECTO = ["Efectivo", "Transferencia", "Débito", "Crédito", "Link de pago", "Otro"]
ENVIOS_DEFECTO = ["STARKEN", "CORREOS DE CHILE", "OTRO"]


def _avisar(texto):
    registro.warning(texto)
    print(f"[listas_y_cuentas] {texto}")


def _json(valor, vacio):
    if isinstance(valor, str):
        return json.loads(valor) if valor else vacio
    return valor if valor is not None else vacio


def _clave(texto):
    t = unicodedata.normalize("NFD", str(texto or ""))
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return " ".join(t.split()).casefold()


class _Lista:
    def __init__(self, c, tabla, que):
        self.c, self.tabla, self.que = c, tabla, que
        self.por_clave = {}
        self.orden = 0

    def agregar(self, nombre, activo=True, **extra):
        nombre = " ".join(str(nombre or "").split())
        if not nombre:
            return None
        k = _clave(nombre)
        if k in self.por_clave:
            return self.por_clave[k]
        self.orden += 1
        columnas = {"nombre": nombre, "orden": self.orden, "activo": activo, **extra}
        nuevo = self.c.execute(sa.text(
            f"INSERT INTO {self.tabla} ({', '.join(columnas)}) VALUES ({', '.join(':' + k for k in columnas)}) RETURNING id"
        ), columnas).scalar()
        self.por_clave[k] = nuevo
        return nuevo

    def usado(self, nombre, donde):
        """El id del elemento que nombra un registro; si no estaba en la lista, entra desactivado."""
        if not str(nombre or "").strip():
            return None
        if _clave(nombre) not in self.por_clave:
            _avisar(f"{donde} decía «{nombre}», que no estaba en la lista de {self.que}: entra desactivado.")
            return self.agregar(nombre, activo=False)
        return self.por_clave[_clave(nombre)]

    def con_clave(self, nombre, clave):
        """Marca con su clave el elemento que se llama así; si no está, lo crea."""
        id_ = self.por_clave.get(_clave(nombre)) or self.agregar(nombre)
        self.c.execute(sa.text(f"UPDATE {self.tabla} SET clave = :k WHERE id = :i"), {"k": clave, "i": id_})


def upgrade() -> None:
    op.create_table("canal_pedido",
                    sa.Column("id", sa.Integer(), primary_key=True),
                    sa.Column("nombre", sa.String(60), nullable=False, unique=True),
                    sa.Column("clave", sa.String(20), nullable=True, unique=True),
                    sa.Column("orden", sa.Integer(), nullable=False, server_default="0"),
                    sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.create_table("medio_pago",
                    sa.Column("id", sa.Integer(), primary_key=True),
                    sa.Column("nombre", sa.String(60), nullable=False, unique=True),
                    sa.Column("clave", sa.String(20), nullable=True, unique=True),
                    sa.Column("orden", sa.Integer(), nullable=False, server_default="0"),
                    sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.create_table("metodo_envio",
                    sa.Column("id", sa.Integer(), primary_key=True),
                    sa.Column("nombre", sa.String(100), nullable=False, unique=True),
                    sa.Column("orden", sa.Integer(), nullable=False, server_default="0"),
                    sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.true()),
                    sa.Column("color", sa.String(20), nullable=True))

    op.add_column("cotizaciones", sa.Column("canal_id", sa.Integer(), sa.ForeignKey("canal_pedido.id"), nullable=True))
    op.add_column("cotizaciones", sa.Column("metodo_envio_id", sa.Integer(), sa.ForeignKey("metodo_envio.id"), nullable=True))
    op.add_column("cotizaciones", sa.Column("comuna_id", sa.Integer(), sa.ForeignKey("comunas.id"), nullable=True))
    op.add_column("personas", sa.Column("metodo_envio_preferido_id", sa.Integer(), sa.ForeignKey("metodo_envio.id"), nullable=True))
    op.add_column("pagos", sa.Column("medio_id", sa.Integer(), sa.ForeignKey("medio_pago.id"), nullable=True))
    op.add_column("pagos", sa.Column("anulado_por_id", sa.String(26), sa.ForeignKey("cuentas_acceso.id"), nullable=True))
    op.add_column("arqueos_caja", sa.Column("abierto_por_id", sa.String(26), sa.ForeignKey("cuentas_acceso.id"), nullable=True))
    op.add_column("arqueos_caja", sa.Column("cerrado_por_id", sa.String(26), sa.ForeignKey("cuentas_acceso.id"), nullable=True))

    c = op.get_bind()

    # --- Las listas, con lo que tenían guardado (o lo de fábrica) ---
    def ajuste(clave):
        return _json(c.execute(sa.text("SELECT valor FROM ajustes_negocio WHERE clave = :k"), {"k": clave}).scalar(), None)

    def sitio(clave):
        return _json(c.execute(sa.text("SELECT value FROM sitesetting WHERE key = :k"), {"k": clave}).scalar(), None)

    canales = _Lista(c, "canal_pedido", "canales")
    for n in ajuste("canales_pedido") or CANALES_DEFECTO:
        canales.agregar(n)
    medios = _Lista(c, "medio_pago", "medios de pago")
    for n in ajuste("medios_pago") or MEDIOS_DEFECTO:
        medios.agregar(n)
    envios = _Lista(c, "metodo_envio", "métodos de envío")
    colores = sitio("shipping_colors") or {}
    for n in sitio("shipping_methods") or ENVIOS_DEFECTO:
        envios.agregar(n, color=colores.get(n))

    # --- Lo registrado, enlazado ---
    region_de = dict(c.execute(sa.text(
        "SELECT co.id, r.nombre FROM comunas co JOIN regiones r ON r.id = co.region_id")).fetchall())
    todas = c.execute(sa.text("SELECT id, nombre FROM comunas")).fetchall()
    for cid, numero, canal, transporte, region, comuna in c.execute(sa.text(
            "SELECT id, numero, canal, transporte, region, comuna FROM cotizaciones ORDER BY numero")).fetchall():
        donde = f"El pedido N° {numero}"
        cambios = {"canal_id": canales.usado(canal, donde), "metodo_envio_id": envios.usado(transporte, donde)}
        if comuna:
            calzan = [i for i, n in todas if _clave(n) == _clave(comuna)]
            if region and len(calzan) > 1:
                calzan = [i for i in calzan if _clave(region_de.get(i)) == _clave(region)]
            if len(calzan) == 1:
                cambios["comuna_id"] = calzan[0]
            else:
                _avisar(f"{donde} tenía la comuna «{comuna}» ({region}), que no calza con la lista de comunas: queda sin comuna.")
        c.execute(sa.text("UPDATE cotizaciones SET " + ", ".join(f"{k} = :{k}" for k in cambios) + " WHERE id = :id"),
                  {**cambios, "id": cid})
    for pid, preferido in c.execute(sa.text("SELECT id, transporte_preferido FROM personas")).fetchall():
        if preferido:
            c.execute(sa.text("UPDATE personas SET metodo_envio_preferido_id = :e WHERE id = :i"),
                      {"e": envios.usado(preferido, "Una clienta"), "i": pid})
    # El saldo a favor no está en la lista editable: es un medio con su clave.
    medios.con_clave("Saldo a favor", "a_favor")
    for pid, medio in c.execute(sa.text("SELECT id, medio FROM pagos")).fetchall():
        c.execute(sa.text("UPDATE pagos SET medio_id = :m WHERE id = :i"),
                  {"m": medios.usado(medio, "Un pago"), "i": pid})
    op.alter_column("pagos", "medio_id", nullable=False)

    # Lo que el sistema reconoce, por clave.
    canales.con_clave("En la tienda", "local")
    medios.con_clave("Efectivo", "efectivo")

    # --- Quién: por su cuenta ---
    cuentas = {}
    for cid, apodo, email, nombres, apellidos in c.execute(sa.text(
            "SELECT c.id, c.apodo, c.email_corporativo, p.nombres, p.apellidos FROM cuentas_acceso c "
            "LEFT JOIN personas p ON p.id = c.persona_id")).fetchall():
        for nombre in (apodo, f"{nombres or ''} {apellidos or ''}".strip(), email):
            if nombre:
                cuentas.setdefault(_clave(nombre), cid)
    for fecha, abierto, cerrado in c.execute(sa.text("SELECT fecha, abierto_por, cerrado_por FROM arqueos_caja")).fetchall():
        for col, nombre in (("abierto_por_id", abierto), ("cerrado_por_id", cerrado)):
            if not nombre:
                continue
            cuenta = cuentas.get(_clave(nombre))
            if cuenta:
                c.execute(sa.text(f"UPDATE arqueos_caja SET {col} = :c WHERE fecha = :f"), {"c": cuenta, "f": fecha})
            else:
                _avisar(f"La caja del {fecha} dice «{nombre}», que no calza con ninguna cuenta: queda solo el nombre.")
    for pid, nombre in c.execute(sa.text("SELECT id, anulado_por FROM pagos WHERE anulado_por IS NOT NULL")).fetchall():
        cuenta = cuentas.get(_clave(nombre))
        if cuenta:
            c.execute(sa.text("UPDATE pagos SET anulado_por_id = :c WHERE id = :i"), {"c": cuenta, "i": pid})
        else:
            _avisar(f"Un pago anulado por «{nombre}» no calza con ninguna cuenta: queda solo el nombre.")
    # Los ids de cuenta que ya existían: si alguno no es de una cuenta, la llave foránea no se puede poner.
    for tabla, col in (("pagos", "registrado_por_id"), ("pedido_eventos", "actor_cuenta_id")):
        huerfanos = c.execute(sa.text(
            f"SELECT count(*) FROM {tabla} t WHERE t.{col} IS NOT NULL "
            f"AND NOT EXISTS (SELECT 1 FROM cuentas_acceso c WHERE c.id = t.{col})")).scalar()
        if huerfanos:
            _avisar(f"{huerfanos} fila(s) de {tabla} apuntaban a una cuenta que no existe: quedan sin cuenta (con su nombre).")
            c.execute(sa.text(f"UPDATE {tabla} t SET {col} = NULL WHERE t.{col} IS NOT NULL "
                              f"AND NOT EXISTS (SELECT 1 FROM cuentas_acceso c WHERE c.id = t.{col})"))
        op.create_foreign_key(f"{tabla}_{col}_fkey", tabla, "cuentas_acceso", [col], ["id"])

    # --- Lo que era copia de texto, fuera ---
    op.drop_column("cotizaciones", "canal")
    op.drop_column("cotizaciones", "transporte")
    op.drop_column("cotizaciones", "region")
    op.drop_column("cotizaciones", "comuna")
    op.drop_column("personas", "transporte_preferido")
    op.drop_column("pagos", "medio")
    c.execute(sa.text("DELETE FROM ajustes_negocio WHERE clave IN ('canales_pedido', 'medios_pago')"))
    c.execute(sa.text("DELETE FROM sitesetting WHERE key IN ('shipping_methods', 'shipping_colors')"))


def downgrade() -> None:
    c = op.get_bind()
    op.add_column("cotizaciones", sa.Column("canal", sa.String(60), nullable=True))
    op.add_column("cotizaciones", sa.Column("transporte", sa.String(100), nullable=True))
    op.add_column("cotizaciones", sa.Column("region", sa.String(100), nullable=True))
    op.add_column("cotizaciones", sa.Column("comuna", sa.String(100), nullable=True))
    op.add_column("personas", sa.Column("transporte_preferido", sa.String(50), nullable=True))
    op.add_column("pagos", sa.Column("medio", sa.String(60), nullable=True))
    op.execute("UPDATE cotizaciones SET canal = l.nombre FROM canal_pedido l WHERE l.id = cotizaciones.canal_id")
    op.execute("UPDATE cotizaciones SET transporte = l.nombre FROM metodo_envio l WHERE l.id = cotizaciones.metodo_envio_id")
    op.execute("UPDATE cotizaciones SET comuna = co.nombre, region = r.nombre FROM comunas co JOIN regiones r ON r.id = co.region_id "
               "WHERE co.id = cotizaciones.comuna_id")
    op.execute("UPDATE personas SET transporte_preferido = l.nombre FROM metodo_envio l WHERE l.id = personas.metodo_envio_preferido_id")
    op.execute("UPDATE pagos SET medio = l.nombre FROM medio_pago l WHERE l.id = pagos.medio_id")
    op.alter_column("pagos", "medio", nullable=False)

    def lista(tabla):
        return [r[0] for r in c.execute(sa.text(
            f"SELECT nombre FROM {tabla} WHERE activo AND {'clave IS DISTINCT FROM ' + repr('a_favor') if tabla == 'medio_pago' else 'true'} "
            "ORDER BY orden, id")).fetchall()]
    for clave, tabla in (("canales_pedido", "canal_pedido"), ("medios_pago", "medio_pago")):
        c.execute(sa.text("INSERT INTO ajustes_negocio (clave, valor, actualizado_at) VALUES (:k, CAST(:v AS JSON), now())"),
                  {"k": clave, "v": json.dumps(lista(tabla))})
    envios = c.execute(sa.text("SELECT nombre, color FROM metodo_envio WHERE activo ORDER BY orden, id")).fetchall()
    c.execute(sa.text("INSERT INTO sitesetting (key, value) VALUES ('shipping_methods', CAST(:v AS JSON))"),
              {"v": json.dumps([n for n, _ in envios])})
    c.execute(sa.text("INSERT INTO sitesetting (key, value) VALUES ('shipping_colors', CAST(:v AS JSON))"),
              {"v": json.dumps({n: col for n, col in envios if col})})

    op.drop_constraint("pedido_eventos_actor_cuenta_id_fkey", "pedido_eventos", type_="foreignkey")
    op.drop_constraint("pagos_registrado_por_id_fkey", "pagos", type_="foreignkey")
    for tabla, col in (("arqueos_caja", "cerrado_por_id"), ("arqueos_caja", "abierto_por_id"), ("pagos", "anulado_por_id"),
                       ("pagos", "medio_id"), ("personas", "metodo_envio_preferido_id"), ("cotizaciones", "comuna_id"),
                       ("cotizaciones", "metodo_envio_id"), ("cotizaciones", "canal_id")):
        op.drop_column(tabla, col)
    op.drop_table("metodo_envio")
    op.drop_table("medio_pago")
    op.drop_table("canal_pedido")
