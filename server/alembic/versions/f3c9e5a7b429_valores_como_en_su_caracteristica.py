"""Los valores de cada variante, escritos como en su característica

Revision ID: f3c9e5a7b429
Revises: e2b8d4f6a318
Create Date: 2026-11-09 00:00:00.000000

  · sku.config: cada valor que coincide (sin mirar mayúsculas) con una opción
    de su característica queda escrito como esa opción.

Al guardar un producto, las tallas grandes quedaban "2xl", "3xl"... (capwords
no sube una palabra que empieza con número), mientras la característica dice
"2XL": el filtro las encontraba igual, pero la ficha mostraba "3xl". Eran 486
variantes, de 2XL a 7XL, en los cuatro productos (reportado por QA
2026-11-09). El código ya está arreglado (normalize_opt).

Solo cambian mayúsculas, así que la vuelta atrás no tiene nada que restaurar.
Los códigos de variante no cambian: van siempre en mayúscula.

Escrita a mano a propósito: en la base hay un tipo `estadocotizacion` viejo
que la autogeneración intentaría reconciliar.
"""
import json
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'f3c9e5a7b429'
down_revision: Union[str, Sequence[str], None] = 'e2b8d4f6a318'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _dict(valor):
    if isinstance(valor, str):
        return json.loads(valor) if valor else {}
    return valor or {}


def _lista(valor):
    if isinstance(valor, str):
        return json.loads(valor) if valor else []
    return valor or []


def upgrade() -> None:
    conexion = op.get_bind()
    opciones = {}
    for nombre, dominio in conexion.execute(sa.text("SELECT name, domain FROM attribute")).fetchall():
        valores = [o.get("value") if isinstance(o, dict) else o for o in _lista(dominio)]
        opciones[str(nombre).strip().upper()] = {str(v).strip().lower(): v for v in valores if v}

    for sku_id, config in conexion.execute(sa.text("SELECT id, config FROM sku")).fetchall():
        config = _dict(config)
        nuevo = {}
        for clave, valor in config.items():
            como_va = opciones.get(str(clave).strip().upper(), {}).get(str(valor).strip().lower())
            nuevo[clave] = como_va if como_va is not None else valor
        if nuevo != config:
            conexion.execute(sa.text("UPDATE sku SET config = CAST(:c AS JSON) WHERE id = :i"),
                             {"c": json.dumps(nuevo), "i": sku_id})


def downgrade() -> None:
    pass
