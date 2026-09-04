from datetime import datetime
from pydantic import BaseModel, Field


class ScheduleCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    cron_expr: str = Field(..., description="Cron expression e.g. '30 8 * * 1-5'")
    drs: str = Field(default="2", description="drs filter: 2=รอรับ, 3=รอส่ง/พิจารณา")
    enabled: bool = True
    auto_accept: bool = False  # ⚠️ must be explicitly set to true


class ScheduleUpdate(BaseModel):
    name: str | None = None
    cron_expr: str | None = None
    drs: str | None = None
    enabled: bool | None = None
    auto_accept: bool | None = None


class ScheduleRead(BaseModel):
    id: int
    name: str
    cron_expr: str
    drs: str
    enabled: bool
    auto_accept: bool
    last_run_at: datetime | None = None
    next_run_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
