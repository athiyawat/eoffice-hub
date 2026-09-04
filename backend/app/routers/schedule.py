"""GET+POST+DELETE /api/schedule — APScheduler management"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.schedule_model import Schedule
from app.schemas.schedule_schema import ScheduleCreate, ScheduleRead, ScheduleUpdate
from app.services.scheduler_service import reload_schedules

router = APIRouter(prefix="/api/schedule", tags=["schedule"])


@router.get("", response_model=list[ScheduleRead])
async def list_schedules(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Schedule).order_by(Schedule.id))
    return result.scalars().all()


@router.post("", response_model=ScheduleRead)
async def create_schedule(data: ScheduleCreate, db: AsyncSession = Depends(get_db)):
    sched = Schedule(
        name=data.name,
        cron_expr=data.cron_expr,
        drs=data.drs,
        enabled=data.enabled,
        auto_accept=data.auto_accept,  # default False
    )
    db.add(sched)
    await db.commit()
    await db.refresh(sched)
    await reload_schedules()
    return sched


@router.patch("/{schedule_id}", response_model=ScheduleRead)
async def update_schedule(
    schedule_id: int, data: ScheduleUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Schedule).where(Schedule.id == schedule_id))
    sched = result.scalar_one_or_none()
    if not sched:
        raise HTTPException(status_code=404, detail="Schedule not found")
    if data.name is not None:
        sched.name = data.name
    if data.cron_expr is not None:
        sched.cron_expr = data.cron_expr
    if data.drs is not None:
        sched.drs = data.drs
    if data.enabled is not None:
        sched.enabled = data.enabled
    if data.auto_accept is not None:
        sched.auto_accept = data.auto_accept
    await db.commit()
    await db.refresh(sched)
    await reload_schedules()
    return sched


@router.delete("/{schedule_id}")
async def delete_schedule(schedule_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Schedule).where(Schedule.id == schedule_id))
    sched = result.scalar_one_or_none()
    if not sched:
        raise HTTPException(status_code=404, detail="Schedule not found")
    await db.delete(sched)
    await db.commit()
    await reload_schedules()
    return {"ok": True, "id": schedule_id}


@router.post("/{schedule_id}/toggle", response_model=ScheduleRead)
async def toggle_schedule(schedule_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Schedule).where(Schedule.id == schedule_id))
    sched = result.scalar_one_or_none()
    if not sched:
        raise HTTPException(status_code=404, detail="Schedule not found")
    sched.enabled = not sched.enabled
    await db.commit()
    await db.refresh(sched)
    await reload_schedules()
    return sched
