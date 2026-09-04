"""POST /api/telegram/test — send test message"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.services.config_service import get_config_value
from app.services.telegram_service import send_telegram, check_telegram

router = APIRouter(prefix="/api/telegram", tags=["telegram"])


@router.post("/test")
async def test_telegram(db: AsyncSession = Depends(get_db)):
    bot_token = await get_config_value(db, "telegram_bot_token")
    chat_id = await get_config_value(db, "telegram_chat_id")

    if not bot_token or not chat_id:
        return {"ok": False, "error": "telegram_bot_token or telegram_chat_id not configured"}

    check = await check_telegram(bot_token, chat_id)
    if not check["ok"]:
        return check

    sent = await send_telegram(
        bot_token, chat_id,
        "✅ *e-Office Saraban Manager*\nทดสอบการแจ้งเตือน Telegram สำเร็จ 🎉"
    )
    return {"ok": sent, "bot": check.get("bot")}
