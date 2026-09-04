"""SQLAlchemy model for saraban_documents (existing table — read-only via ORM)"""
from datetime import datetime
from sqlalchemy import BigInteger, Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.db import Base


class SarabanDocument(Base):
    __tablename__ = "saraban_documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    doc_id: Mapped[int] = mapped_column(BigInteger, unique=True, nullable=False)
    original_doc_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    book_number: Mapped[str | None] = mapped_column(Text, nullable=True)
    subject: Mapped[str] = mapped_column(Text, nullable=False)
    sender_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    sender_dept: Mapped[str | None] = mapped_column(Text, nullable=True)
    recipient_dept: Mapped[str | None] = mapped_column(Text, nullable=True)
    urgency_level: Mapped[str] = mapped_column(Text, default="ปกติ")
    category: Mapped[str] = mapped_column(Text, default="information")
    bucket_id: Mapped[int] = mapped_column(Integer, default=390)
    doc_rec_status: Mapped[str | None] = mapped_column(Text, nullable=True)
    have_file_group: Mapped[int] = mapped_column(Integer, default=0)

    send_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    add_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    doc_rec_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    done_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deadline_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    formatted_msg: Mapped[str | None] = mapped_column(Text, nullable=True)

    meeting_info: Mapped[dict] = mapped_column(JSONB, default=dict)
    action_items: Mapped[list] = mapped_column(JSONB, default=list)
    has_action_required: Mapped[bool] = mapped_column(Boolean, default=False)

    attachment_ids: Mapped[list] = mapped_column(JSONB, default=list)
    eoffice_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    processed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    backfill_version: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_msg: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
