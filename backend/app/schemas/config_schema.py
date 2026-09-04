from datetime import datetime
from pydantic import BaseModel, Field


class ConfigItem(BaseModel):
    key: str
    value: str | None = None   # plaintext (write) or masked (read)
    is_secret: bool = False
    description: str | None = None


class ConfigRead(BaseModel):
    key: str
    value: str | None = None  # masked as "***" for secrets
    is_secret: bool
    description: str | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class ConfigWrite(BaseModel):
    key: str = Field(..., min_length=1, max_length=128)
    value: str
    is_secret: bool = False
    description: str | None = None
