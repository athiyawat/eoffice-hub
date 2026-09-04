"""POST /api/sweep/run — manual sweep trigger"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.services.sweep_service import run_sweep

router = APIRouter(prefix="/api/sweep", tags=["sweep"])


@router.post("/run")
async def manual_sweep(
    drs: str = Query(default="2", description="drs filter: 2=รอรับ, 3=รอส่ง/พิจารณา"),
    dry_run: bool = Query(default=False, description="Dry run — no DB writes or Telegram"),
    db: AsyncSession = Depends(get_db),
):
    result = await run_sweep(db=db, drs=drs, dry_run=dry_run, trigger="manual")
    return result
