"""Estados de la cotización con un significado cada uno

    NUEVA            -> NUEVA             (igual)
    EN_PROCESO       -> EN_CONVERSACION   ("contactando al cliente")
    CERRADA_EXITO    -> CONFIRMADA        ("el cliente aceptó", que es lo que
                                           decía el glosario de la pantalla)
    CERRADA_PERDIDA  -> CANCELADA
    (nuevo)             DESPACHADA        salió del taller

Por qué
-------
Los nombres viejos no tenían un significado decidido. El glosario de la pantalla
definía EN_PROCESO como "contactando al cliente O armando pedido": dos cosas
distintas en una línea, y por eso nadie sabía qué quería decir.

El cambio de comportamiento es UNO: el stock salía de bodega cuando la clienta
ACEPTABA, semanas antes de que la prenda existiera. Ahora sale en DESPACHADA.

Conciliación del stock
----------------------
Los movimientos SALE creados bajo la regla vieja quedaron colgando: pertenecen a
pedidos que ahora son CONFIRMADA (aceptados, todavía no despachados), así que no
corresponden. Se borran acá. Es lo mismo que hace el sistema al reabrir un
pedido, y se vuelven a crear solos cuando se marque DESPACHADA.

`down_revision` restaura los nombres, pero NO los movimientos borrados: se
regeneran al despachar.

Revision ID: a3b4c5d6e7f8
Revises: f2a3b4c5d6e7
"""
from alembic import op
import sqlalchemy as sa

revision = 'a3b4c5d6e7f8'
down_revision = 'f2a3b4c5d6e7'
branch_labels = None
depends_on = None

# 'EN_CONVERSACION' mide exactamente 15, el largo justo de la columna vieja.
# Se ensancha para que el próximo nombre no reviente por un carácter.
LARGO = 20

MAPA = {
    'EN_PROCESO': 'EN_CONVERSACION',
    'CERRADA_EXITO': 'CONFIRMADA',
    'CERRADA_PERDIDA': 'CANCELADA',
}


def upgrade():
    op.alter_column('cotizaciones', 'estado',
                    existing_type=sa.VARCHAR(length=15),
                    type_=sa.VARCHAR(length=LARGO),
                    existing_nullable=False)

    for viejo, nuevo in MAPA.items():
        op.execute(sa.text("UPDATE cotizaciones SET estado = :n WHERE estado = :v")
                   .bindparams(n=nuevo, v=viejo))

    # Ventas registradas con la regla vieja (al aceptar). Ahora la venta ocurre
    # al despachar, y nada quedó en DESPACHADA, así que ninguna corresponde.
    op.execute("""
        DELETE FROM stockmovement
        WHERE type = 'SALE'
          AND reference_id IN (
              SELECT ci.id FROM cotizacion_items ci
              JOIN cotizaciones c ON c.id = ci.cotizacion_id
              WHERE c.estado <> 'DESPACHADA'
          )
    """)


def downgrade():
    for viejo, nuevo in MAPA.items():
        op.execute(sa.text("UPDATE cotizaciones SET estado = :v WHERE estado = :n")
                   .bindparams(n=nuevo, v=viejo))
    # DESPACHADA no existía: lo más cercano es "cerrada con éxito".
    op.execute("UPDATE cotizaciones SET estado = 'CERRADA_EXITO' WHERE estado = 'DESPACHADA'")
    op.alter_column('cotizaciones', 'estado',
                    existing_type=sa.VARCHAR(length=LARGO),
                    type_=sa.VARCHAR(length=15),
                    existing_nullable=False)
