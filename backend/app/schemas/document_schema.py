from datetime import datetime
from typing import Any
from pydantic import BaseModel


class DocumentRead(BaseModel):
    id: int
    doc_id: int
    original_doc_id: int | None = None
    book_number: str | None = None
    subject: str
    sender_name: str | None = None
    sender_dept: str | None = None
    recipient_dept: str | None = None
    urgency_level: str = "ปกติ"
    category: str = "information"
    doc_rec_status: str | None = None
    have_file_group: int = 0
    send_date: datetime | None = None
    done_date: datetime | None = None
    deadline_at: datetime | None = None
    summary_text: str | None = None
    meeting_info: dict[str, Any] = {}
    action_items: list[Any] = []
    has_action_required: bool = False
    eoffice_url: str | None = None
    processed_at: datetime | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class DocumentListResponse(BaseModel):
    items: list[DocumentRead]
    total: int
    page: int
    limit: int
