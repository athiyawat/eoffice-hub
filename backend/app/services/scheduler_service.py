"""APScheduler integration — loads schedules from DB and executes sweep"""
import logging
from datetime import datetime, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None


def get_scheduler() -> AsyncIOScheduler:
    global _scheduler
    if _scheduler is None:
        _scheduler = AsyncIOScheduler(timezone="Asia/Bangkok")
    return _scheduler


async def _run_sweep_job(schedule_id: int, drs: str, auto_accept: bool) -> None:
    """Job executed by APScheduler"""
    from app.db import get_db_context
    from app.services.sweep_service import run_sweep
    from app.models.schedule_model import Schedule
    from sqlalchemy import select

    async with get_db_context() as db:
        try:
            result = await run_sweep(
                db=db,
                drs=drs,
                dry_run=False,
                trigger="scheduler",
                auto_accept=auto_accept,
            )
            logger.info(f"Scheduled sweep done: schedule_id={schedule_id} result={result}")
            # Update last_run_at
            res = await db.execute(select(Schedule).where(Schedule.id == schedule_id))
            sched = res.scalar_one_or_none()
            if sched:
                sched.last_run_at = datetime.now(timezone.utc)
                await db.commit()
        except Exception as e:
            logger.error(f"Scheduled sweep error: schedule_id={schedule_id} error={e}")


async def reload_schedules() -> None:
    """Load all enabled schedules from DB and (re)register with APScheduler"""
    from app.db import get_db_context
    from app.models.schedule_model import Schedule
    from sqlalchemy import select

    scheduler = get_scheduler()

    # Remove all existing sweep jobs
    for job in scheduler.get_jobs():
        if job.id.startswith("sweep_"):
            job.remove()

    async with get_db_context() as db:
        result = await db.execute(
            select(Schedule).where(Schedule.enabled == True)  # noqa: E712
        )
        schedules = result.scalars().all()

    for sched in schedules:
        job_id = f"sweep_{sched.id}"
        try:
            trigger = CronTrigger.from_crontab(sched.cron_expr, timezone="Asia/Bangkok")
            scheduler.add_job(
                _run_sweep_job,
                trigger=trigger,
                id=job_id,
                args=[sched.id, sched.drs, sched.auto_accept],
                replace_existing=True,
                misfire_grace_time=300,
            )
            logger.info(f"Registered schedule job: {job_id} cron={sched.cron_expr}")
        except Exception as e:
            logger.error(f"Failed to register schedule {sched.id}: {e}")


async def start_scheduler() -> None:
    scheduler = get_scheduler()
    await reload_schedules()
    if not scheduler.running:
        scheduler.start()
        logger.info("APScheduler started")


async def stop_scheduler() -> None:
    scheduler = get_scheduler()
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler stopped")
