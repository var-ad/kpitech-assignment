"""add cooking_method to menu_items

Revision ID: ff984ab80d01
Revises: 5e422c0b13bf
Create Date: 2026-07-02 23:42:12.197243

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ff984ab80d01'
down_revision: Union[str, Sequence[str], None] = '5e422c0b13bf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


ENUM_NAME = 'cooking_method'
ENUM_VALUES = ['none', 'fried', 'steamed', 'grilled', 'baked', 'roasted', 'boiled', 'raw']


def upgrade() -> None:
    """Upgrade schema."""
    # Create the enum type first (PostgreSQL requires this before the column)
    op.execute(f"DO $$ BEGIN CREATE TYPE {ENUM_NAME} AS ENUM ({','.join(repr(v) for v in ENUM_VALUES)}); EXCEPTION WHEN duplicate_object THEN NULL; END $$;")
    # Add column, nullable for the migration then set default for existing rows
    op.add_column('menu_items',
        sa.Column('cooking_method', sa.Enum(*ENUM_VALUES, name=ENUM_NAME, create_type=False), nullable=True))
    # Set default 'none' for existing rows
    op.execute("UPDATE menu_items SET cooking_method = 'none' WHERE cooking_method IS NULL")
    # Now make it not null
    op.alter_column('menu_items', 'cooking_method', nullable=False, server_default='none')


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('menu_items', 'cooking_method')
    op.execute(f"DROP TYPE IF EXISTS {ENUM_NAME}")
