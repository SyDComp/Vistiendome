"""add analytics_event table (inteligencia de negocio)

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-06-24
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'analytics_event',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=True),
        sa.Column('sku', sa.String(), nullable=True),
        sa.Column('query', sa.String(), nullable=True),
        sa.Column('session_id', sa.String(), nullable=True),
        sa.Column('meta', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_analytics_event_type', 'analytics_event', ['type'])
    op.create_index('ix_analytics_event_product_id', 'analytics_event', ['product_id'])
    op.create_index('ix_analytics_event_sku', 'analytics_event', ['sku'])
    op.create_index('ix_analytics_event_session_id', 'analytics_event', ['session_id'])
    op.create_index('ix_analytics_event_created_at', 'analytics_event', ['created_at'])


def downgrade() -> None:
    op.drop_index('ix_analytics_event_created_at', table_name='analytics_event')
    op.drop_index('ix_analytics_event_session_id', table_name='analytics_event')
    op.drop_index('ix_analytics_event_sku', table_name='analytics_event')
    op.drop_index('ix_analytics_event_product_id', table_name='analytics_event')
    op.drop_index('ix_analytics_event_type', table_name='analytics_event')
    op.drop_table('analytics_event')
