"""Initial tables: app_config, schedules, run_logs

Revision ID: 20260904_0001
Revises: 
Create Date: 2026-09-04 17:00:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260904_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ---- app_config ----
    op.create_table(
        "app_config",
        sa.Column("key", sa.String(length=128), nullable=False),
        sa.Column("value_enc", sa.Text(), nullable=True),   # Fernet encrypted
        sa.Column("is_secret", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.PrimaryKeyConstraint("key"),
    )

    # ---- schedules ----
    op.create_table(
        "schedules",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("cron_expr", sa.String(length=64), nullable=False),
        sa.Column("drs", sa.String(length=8), nullable=False, server_default="2"),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("auto_accept", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("last_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # ---- run_logs ----
    op.create_table(
        "run_logs",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("trigger", sa.String(length=64), nullable=True),  # manual / scheduler / api
        sa.Column("drs", sa.String(length=8), nullable=True),
        sa.Column("new_docs", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("status", sa.String(length=32), nullable=True),  # success/error/token_expired
        sa.Column("error_msg", sa.Text(), nullable=True),
        sa.Column("telegram_sent", sa.Boolean(), nullable=True, server_default="false"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index("idx_run_logs_started_at", "run_logs", ["started_at"])
    op.create_index("idx_schedules_enabled", "schedules", ["enabled"])


def downgrade() -> None:
    op.drop_table("run_logs")
    op.drop_table("schedules")
    op.drop_table("app_config")
