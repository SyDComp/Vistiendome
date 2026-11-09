"""La ubicación de una clienta puede ser solo su comuna

Revision ID: a4d0f6b8c531
Revises: f3c9e5a7b429
Create Date: 2026-11-09 00:00:00.000000

  · direcciones.calle_y_numero: puede ir vacía (core/ubicacion_persona.py).
  · Las clientas sin ubicación toman la de su último pedido con despacho, si
    su comuna se reconoce (por nombre, y por región si hay dos iguales).

Un despacho a sucursal no trae calle, y la ubicación solo se guardaba con
calle: el pedido decía la comuna y la clienta quedaba "No registrada"
(reportado por QA 2026-11-09).

La vuelta atrás borra lo agregado acá (las que no tienen calle) y vuelve a
exigirla.

Escrita a mano a propósito: en la base hay un tipo `estadocotizacion` viejo
que la autogeneración intentaría reconciliar.
"""
import unicodedata
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a4d0f6b8c531'
down_revision: Union[str, Sequence[str], None] = 'f3c9e5a7b429'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _norma(texto) -> str:
    texto = unicodedata.normalize("NFKD", str(texto or "")).encode("ascii", "ignore").decode("utf-8")
    return " ".join(texto.lower().replace("region de", "").replace("region del", "").split())


def upgrade() -> None:
    op.alter_column('direcciones', 'calle_y_numero', existing_type=sa.String(length=255), nullable=True)
    conexion = op.get_bind()

    comunas = conexion.execute(sa.text(
        "SELECT c.id, c.nombre, r.nombre FROM comunas c JOIN regiones r ON r.id = c.region_id")).fetchall()
    por_nombre = {}
    for comuna_id, nombre, region in comunas:
        por_nombre.setdefault(_norma(nombre), []).append((comuna_id, _norma(region)))

    pedidos = conexion.execute(sa.text("""
        SELECT DISTINCT ON (c.persona_id) c.persona_id, c.comuna, c.region, c.direccion, c.tipo_despacho
        FROM cotizaciones c
        WHERE c.persona_id IS NOT NULL AND c.comuna IS NOT NULL AND CAST(c.modo_entrega AS TEXT) = 'DESPACHO'
          AND NOT EXISTS (SELECT 1 FROM direcciones d WHERE d.persona_id = c.persona_id)
        ORDER BY c.persona_id, c.created_at DESC
    """)).fetchall()
    for persona_id, comuna, region, direccion, tipo in pedidos:
        candidatas = por_nombre.get(_norma(comuna), [])
        if len(candidatas) > 1:
            candidatas = [c for c in candidatas if c[1] and c[1] in _norma(region)] or []
        if len(candidatas) != 1:
            continue
        calle = (direccion or "").strip() if str(tipo or "").upper().endswith("DOMICILIO") else ""
        conexion.execute(sa.text(
            "INSERT INTO direcciones (id, persona_id, comuna_id, calle_y_numero, created_at) "
            "VALUES (:id, :p, :c, :calle, now())"),
            {"id": f"UB{persona_id[-24:]}", "p": persona_id, "c": candidatas[0][0], "calle": calle or None})


def downgrade() -> None:
    op.execute("DELETE FROM direcciones WHERE calle_y_numero IS NULL")
    op.alter_column('direcciones', 'calle_y_numero', existing_type=sa.String(length=255), nullable=False)
