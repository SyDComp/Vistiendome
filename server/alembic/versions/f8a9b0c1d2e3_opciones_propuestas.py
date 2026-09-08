"""Opciones propuestas por los clientes

Revision ID: f8a9b0c1d2e3
Revises: e7f8a9b0c1d2

Una opcion de una caracteristica puede venir de tres lados y hay que
distinguirlos: del sistema, creada por Paola, o PROPUESTA por un cliente.

Las dos primeras ya se distinguen dentro del `domain` de la caracteristica
(is_system true/false). La tercera no existia.

Va en tabla propia y no como una marca dentro del JSON del domain por dos
razones:

  · Si tres clientas piden "Turquesa Perla", la opcion es UNA y las proponentes
    son TRES. Esa cuenta es la senal para decidir si vale la pena crear el
    color; con una marca si/no se pierde.
  · Dentro del JSON no hay relacion real con la persona ni con el pedido, ni
    forma comoda de contar.

Una fila por cada vez que alguien propone algo. Se agrupan por
valor_normalizado.
"""
from alembic import op
import sqlalchemy as sa


revision = 'f8a9b0c1d2e3'
down_revision = 'e7f8a9b0c1d2'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'opciones_propuestas',
        sa.Column('id', sa.String(length=26), primary_key=True),
        sa.Column('attribute_id', sa.Integer(), sa.ForeignKey('attribute.id'), nullable=False, index=True),
        sa.Column('valor', sa.String(length=120), nullable=False),
        sa.Column('valor_normalizado', sa.String(length=120), nullable=False, index=True),
        sa.Column('persona_id', sa.String(length=26), sa.ForeignKey('personas.id'), nullable=True, index=True),
        sa.Column('cotizacion_id', sa.String(length=26), sa.ForeignKey('cotizaciones.id'), nullable=True, index=True),
        sa.Column('estado', sa.String(length=20), nullable=False, server_default='PENDIENTE', index=True),
        sa.Column('creado_en', sa.DateTime(), nullable=False),
        sa.Column('resuelto_en', sa.DateTime(), nullable=True),
    )


def downgrade():
    op.drop_table('opciones_propuestas')
