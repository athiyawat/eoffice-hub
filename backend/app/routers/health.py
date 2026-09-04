"""GET /api/health — checks DB, token, telegram"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.db import get_db
from app.services.config_service import get_config_value
from app.services.eoffice_client import check_token_valid
from app.services.telegram_service import check_telegram

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
async def health(db: AsyncSession = Depends(get_db)):
    status: dict = {"status": "ok", "checks": {}}

    # DB check
    try:
        await db.execute(text("SELECT 1"))
        status["checks"]["db"] = "ok"
    except Exception as e:
        status["checks"]["db"] = f"error: {e}"
        status["status"] = "degraded"

    # Token check
    try:
        token = await get_config_value(db, "eoffice_token")
        if token:
            valid = await check_token_valid(token)
            status["checks"]["eoffice_token"] = "valid" if valid else "expired"
        else:
            status["checks"]["eoffice_token"] = "not_configured"
    except Exception as e:
        status["checks"]["eoffice_token"] = f"error: {e}"

    # Telegram check
    try:
        bot_token = await get_config_value(db, "telegram_bot_token")
        chat_id = await get_config_value(db, "telegram_chat_id")
        if bot_token:
            tg = await check_telegram(bot_token, chat_id or "")
            status["checks"]["telegram"] = "ok" if tg["ok"] else f"error: {tg.get('error')}"
        else:
            status["checks"]["telegram"] = "not_configured"
    except Exception as e:
        status["checks"]["telegram"] = f"error: {e}"

    return status
