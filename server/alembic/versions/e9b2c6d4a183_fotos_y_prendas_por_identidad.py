"""Las fotos y las prendas de la portada se nombran por identidad

Revision ID: e9b2c6d4a183
Revises: d4a8f1c3e957
Create Date: 2026-11-25 00:00:00.000000

  · collection.portada_id: la foto de portada de cada colección, desde
    collection.image_url (texto), que se quita. Se reconoce la foto por su
    dirección o por la de una de sus versiones livianas. Si una dirección no
    es de ninguna foto de la Galería, la colección queda sin portada y la
    dirección queda anotada en el registro: revisar ANTES de desplegar.
  · Portada (homepagesection.config) y ajustes del sitio (sitesetting.value):
    una foto nombrada solo por su dirección recibe también su id, para que
    siga viéndose si la foto cambia de nombre y salga al borrarla.
  · Una prenda del catálogo puesta en la portada recibe el id de su variante
    (sacado del código en su link, o de sus códigos anteriores), para que el
    link se arme siempre con la dirección de hoy.

Escrita a mano a propósito: en la base hay un tipo `estadocotizacion` viejo
que la autogeneración intentaría reconciliar.
"""
import json
import logging
import os
import re
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'e9b2c6d4a183'
down_revision: Union[str, Sequence[str], None] = 'd4a8f1c3e957'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

registro = logging.getLogger("alembic.fotos_y_prendas")

_DERIVADA = re.compile(r"_(sm|md|xl|lg)$")
_LINK_PRENDA = re.compile(r"^/catalogo/producto/[^/]+/([^/?#]+)")


def _avisar(texto):
    registro.warning(texto)
    print(f"[fotos_y_prendas] {texto}")


def _json(valor, vacio):
    if isinstance(valor, str):
        return json.loads(valor) if valor else vacio
    return valor if valor is not None else vacio


class _Galeria:
    def __init__(self, c):
        self.por_url = {}
        self.por_base = {}
        for aid, url, filename in c.execute(sa.text("SELECT id, url, filename FROM mediaasset")).fetchall():
            self.por_url[url] = aid
            self.por_base.setdefault(os.path.splitext(filename)[0], aid)
        self.skus = {codigo: sid for sid, codigo in c.execute(sa.text("SELECT id, sku FROM sku")).fetchall()}
        for sid, anterior in c.execute(sa.text("SELECT sku_id, anterior FROM codigos_variante_anteriores")).fetchall():
            self.skus.setdefault(anterior, sid)

    def foto(self, url):
        if not isinstance(url, str) or not url:
            return None
        url = url.split("?")[0].strip()
        if url in self.por_url:
            return self.por_url[url]
        base = _DERIVADA.sub("", os.path.splitext(os.path.basename(url))[0])
        return self.por_base.get(base)

    def enlazar(self, nodo):
        """El JSON con los ids que faltan. Devuelve (nuevo, ¿cambió?)."""
        if isinstance(nodo, list):
            pares = [self.enlazar(x) for x in nodo]
            return [p[0] for p in pares], any(p[1] for p in pares)
        if not isinstance(nodo, dict):
            return nodo, False
        nuevo, cambio = {}, False
        for k, v in nodo.items():
            nuevo[k], c = self.enlazar(v)
            cambio = cambio or c
        if "url" in nuevo and not nuevo.get("asset_id"):
            aid = self.foto(nuevo["url"])
            if aid:
                nuevo["asset_id"], cambio = aid, True
        if "image_url" in nuevo and not nuevo.get("image_asset_id"):
            aid = self.foto(nuevo["image_url"])
            if aid:
                nuevo["image_asset_id"], cambio = aid, True
        if isinstance(nuevo.get("link"), str) and not nuevo.get("sku_id"):
            m = _LINK_PRENDA.match(nuevo["link"])
            if m and m.group(1) in self.skus:
                nuevo["sku_id"], cambio = self.skus[m.group(1)], True
        return nuevo, cambio


def upgrade() -> None:
    op.add_column("collection", sa.Column("portada_id", sa.Integer(), sa.ForeignKey("mediaasset.id"), nullable=True))
    c = op.get_bind()
    galeria = _Galeria(c)

    for cid, nombre, url in c.execute(sa.text("SELECT id, name, image_url FROM collection ORDER BY id")).fetchall():
        if not url:
            continue
        aid = galeria.foto(url)
        if aid:
            c.execute(sa.text("UPDATE collection SET portada_id = :a WHERE id = :i"), {"a": aid, "i": cid})
        else:
            _avisar(f"La portada de la colección «{nombre}» era '{url}', que no es una foto de la Galería: queda sin portada.")

    for sid, config in c.execute(sa.text("SELECT id, config FROM homepagesection ORDER BY id")).fetchall():
        nuevo, cambio = galeria.enlazar(_json(config, {}))
        if cambio:
            c.execute(sa.text("UPDATE homepagesection SET config = CAST(:v AS JSON) WHERE id = :i"),
                      {"v": json.dumps(nuevo), "i": sid})
    for clave, valor in c.execute(sa.text("SELECT key, value FROM sitesetting ORDER BY key")).fetchall():
        nuevo, cambio = galeria.enlazar(_json(valor, {}))
        if cambio:
            c.execute(sa.text("UPDATE sitesetting SET value = CAST(:v AS JSON) WHERE key = :k"),
                      {"v": json.dumps(nuevo), "k": clave})

    op.drop_column("collection", "image_url")


def downgrade() -> None:
    op.add_column("collection", sa.Column("image_url", sa.String(), nullable=True))
    op.execute("UPDATE collection SET image_url = m.url FROM mediaasset m WHERE m.id = collection.portada_id")
    op.drop_column("collection", "portada_id")
    # Los ids agregados a la portada y los ajustes no estorban a la versión anterior: se dejan.
