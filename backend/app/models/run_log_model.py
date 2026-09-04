"""SQLAlchemy model for run_logs table"""
from datetime import datetime
from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db import Base


class RunLog(Base):
    __tablename__ = "run_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    trigger: Mapped[str | None] = mapped_column(String(64), nullable=True)  # manual/scheduler/api
    drs: Mapped[str | None] = mapped_column(String(8), nullable=True)
    new_docs: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str | None] = mapped_column(String(32), nullable=True)  # success/error/token_expired
    error_msg: Mapped[str | None] = mapped_column(Text, nullable=True)
    telegram_sent: Mapped[bool] = mapped_column(Boolean, default=False)
