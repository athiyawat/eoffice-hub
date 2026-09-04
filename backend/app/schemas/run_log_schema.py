from datetime import datetime
from pydantic import BaseModel


class RunLogRead(BaseModel):
    id: int
    started_at: datetime
    finished_at: datetime | None = None
    trigger: str | None = None
    drs: str | None = None
    new_docs: int = 0
    status: str | None = None
    error_msg: str | None = None
    telegram_sent: bool = False

    model_config = {"from_attributes": True}
