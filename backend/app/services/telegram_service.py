"""Telegram notification service"""
import httpx
from typing import Any


TELEGRAM_API = "https://api.telegram.org"
MAX_MSG_LEN = 4000


async def send_telegram(bot_token: str, chat_id: str, text: str) -> bool:
    """Send message to Telegram; split if > 4000 chars"""
    if not bot_token or not chat_id:
        return False

    chunks = [text[i:i+MAX_MSG_LEN] for i in range(0, len(text), MAX_MSG_LEN)]
    all_ok = True

    async with httpx.AsyncClient(timeout=10.0) as client:
        for chunk in chunks:
            try:
                resp = await client.post(
                    f"{TELEGRAM_API}/bot{bot_token}/sendMessage",
                    json={
                        "chat_id": chat_id,
                        "text": chunk,
                        "parse_mode": "Markdown",
                        "disable_web_page_preview": True,
                    },
                )
                data = resp.json()
                if not data.get("ok"):
                    all_ok = False
            except Exception:
                all_ok = False

    return all_ok


async def check_telegram(bot_token: str, chat_id: str) -> dict[str, Any]:
    """Verify Telegram bot token and chat_id"""
    if not bot_token:
        return {"ok": False, "error": "bot_token is empty"}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{TELEGRAM_API}/bot{bot_token}/getMe")
        data = resp.json()
        if not data.get("ok"):
            return {"ok": False, "error": data.get("description", "invalid token")}
        return {"ok": True, "bot": data.get("result", {}).get("username")}
    except Exception as e:
        return {"ok": False, "error": str(e)}
