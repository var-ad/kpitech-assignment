"""create_tables

Revision ID: 55f01df8354e
Revises:
Create Date: 2026-07-02 02:14:39.276618

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


revision: str = "55f01df8354e"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # Create order_status enum type (idempotent via DO block)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE order_status AS ENUM (
                'placed', 'confirmed', 'preparing', 'ready', 'picked_up'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    # menu_items table
    op.create_table(
        "menu_items",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("category", sa.String(length=100), nullable=False),
        sa.Column("price", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column(
            "is_vegetarian", sa.Boolean(), server_default=sa.text("false"), nullable=False
        ),
        sa.Column(
            "is_spicy", sa.Boolean(), server_default=sa.text("false"), nullable=False
        ),
        sa.Column(
            "available", sa.Boolean(), server_default=sa.text("true"), nullable=False
        ),
        sa.Column("embedding", Vector(384), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint("price >= 0", name="ck_menu_item_price_non_negative"),
    )

    # orders table (use sa.String for status to avoid auto-create-type)
    op.create_table(
        "orders",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "status",
            sa.String(length=20),
            server_default="placed",
            nullable=False,
        ),
        sa.Column("total_amount", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Drop text default, alter to enum type, re-add with cast
    op.execute("ALTER TABLE orders ALTER COLUMN status DROP DEFAULT")
    op.execute("""
        ALTER TABLE orders
        ALTER COLUMN status TYPE order_status USING status::order_status
    """)
    op.execute("ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'placed'::order_status")

    # order_items table
    op.create_table(
        "order_items",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "order_id",
            sa.Integer(),
            sa.ForeignKey("orders.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "menu_item_id",
            sa.Integer(),
            sa.ForeignKey("menu_items.id"),
            nullable=False,
        ),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint("quantity > 0", name="ck_order_item_quantity_positive"),
        sa.CheckConstraint(
            "unit_price >= 0", name="ck_order_item_unit_price_non_negative"
        ),
    )


def downgrade() -> None:
    op.drop_table("order_items")
    op.drop_table("orders")
    op.execute("DROP TYPE IF EXISTS order_status")
    op.drop_table("menu_items")
    op.execute("DROP EXTENSION IF EXISTS vector")
