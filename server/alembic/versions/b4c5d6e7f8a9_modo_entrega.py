"""Cotización: modo_entrega (RETIRO | DESPACHO)

Separa dos preguntas que estaban mezcladas en un solo campo de texto libre:

  modo_entrega    ¿retiro en el local, o sale con un transportista?
  transporte      ¿con quién sale?        (sólo si es DESPACHO)
  tipo_despacho   ¿a domicilio o a la agencia?  (sólo si es DESPACHO)

"Retiro en sucursal" ES UN DESPACHO: la prenda salió del local y la clienta la
retira de la agencia del transportista. Por eso no puede vivir en el mismo
campo que "retiro en local", donde la prenda no se mueve.

La inferencia para los pedidos que ya existen
---------------------------------------------
Acá SÍ se adivina, una vez, sobre 14 filas y con el resultado a la vista — que
es distinto de una regla que adivina en cada ejecución para siempre.

Es RETIRO sólo si el transporte coincide con alguno de los nombres conocidos de
retiro en local, y NO contiene "sucursal". Todo lo demás es DESPACHO, que es el
lado seguro: marcar un despacho como retiro dejaría stock adentro que ya salió.

Revision ID: b4c5d6e7f8a9
Revises: a3b4c5d6e7f8
"""
from alembic import op
import sqlalchemy as sa

revision = 'b4c5d6e7f8a9'
down_revision = 'a3b4c5d6e7f8'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('cotizaciones', sa.Column('modo_entrega', sa.String(length=20), nullable=True))

    op.execute("""
        UPDATE cotizaciones
        SET modo_entrega = CASE
            WHEN upper(coalesce(transporte, '')) LIKE '%SUCURSAL%' THEN 'DESPACHO'
            WHEN upper(coalesce(transporte, '')) IN (
                     'RETIRO_LOCAL', 'RETIRO EN LOCAL', 'RETIRO EN TIENDA', 'RETIRO'
                 ) THEN 'RETIRO'
            ELSE 'DESPACHO'
        END
    """)


def downgrade():
    op.drop_column('cotizaciones', 'modo_entrega')
