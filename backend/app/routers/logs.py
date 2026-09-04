"""GET /api/logs — run log history"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.run_log_model import RunLog
from app.schemas.run_log_schema import RunLogRead

router = APIRouter(prefix="/api/logs", tags=["logs"])


@router.get("", response_model=list[RunLogRead])
async def list_logs(
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    status: str | None = Query(None),
):
    query = select(RunLog).order_by(RunLog.started_at.desc())
    if status:
        query = query.where(RunLog.status == status)
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()
