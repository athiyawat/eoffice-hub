"""e-Office API client — ported from saraban_daily_sweep.js"""
import httpx
from typing import Any

EOFFICE_BASE = "https://eoffice.ntplc.co.th"
BUCKET_ID = 390
DEFAULT_TIMEOUT = 15.0


class TokenExpiredError(Exception):
    pass


class EOfficeAPIError(Exception):
    pass


def resolve_doc_state(doc: dict) -> dict:
    """
    อ่านสถานะจริงต่อฉบับจาก field ของ e-Office (ไม่พึ่ง drs)
    Ported from resolveDocState() in saraban_daily_sweep.js
    """
    rec = (doc.get("doc_rec_status") or "").strip()
    has_approve = bool(doc.get("approve_date"))

    if rec == "รอรับ":
        return {"code": "WAIT_RECEIVE", "label": "รอรับ", "icon": "🔔", "action": "ให้กดรับหนังสือ"}
    if rec == "รอส่ง":
        if has_approve:
            return {"code": "APPROVED_WAIT_SEND", "label": "ผ่านพิจารณา · รอส่งออก", "icon": "📤", "action": "ติดตามการส่งออก"}
        return {"code": "WAIT_CONSIDER", "label": "รอพิจารณา", "icon": "📋", "action": "รอพิจารณา/สั่งการ"}
    if rec == "ส่งแล้ว":
        return {"code": "SENT", "label": "ส่งแล้ว", "icon": "✅", "action": "ปิดเคส"}
    if rec == "ปิดงาน":
        return {"code": "CLOSED", "label": "ปิดงาน", "icon": "🏁", "action": "ปิดเคส"}
    if rec == "ปฏิเสธการรับ":
        return {"code": "REJECTED", "label": "ปฏิเสธการรับ", "icon": "⛔", "action": "ตรวจสอบ"}
    if rec == "ตีกลับเอกสาร":
        return {"code": "RETURNED", "label": "ตีกลับเอกสาร", "icon": "↩️", "action": "ตรวจสอบ"}
    return {"code": "UNKNOWN", "label": rec or "ไม่ทราบสถานะ", "icon": "❔", "action": "-"}


async def fetch_saraban_list(
    token: str,
    drs: str = "2",
    page: int = 1,
    limit: int = 50,
    send_case: str = "0",
    bucket_id: int = BUCKET_ID,
    base_url: str = EOFFICE_BASE,
) -> dict[str, Any]:
    """
    Ported from fetchSarabanList() in saraban_daily_sweep.js
    GET /api/saraban/list_receive/{BUCKET_ID}?page=&limit=&doc_rec_status={drs}&send_case=0&doc_no=&years=2569
    """
    url = (
        f"{base_url}/api/saraban/list_receive/{bucket_id}"
        f"?page={page}&limit={limit}&doc_rec_status={drs}"
        f"&send_case={send_case}&doc_no=&years=2569"
    )
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }
    async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT, verify=False) as client:
        resp = await client.get(url, headers=headers)

    if resp.status_code == 401:
        raise TokenExpiredError("HTTP 401 — Token expired")
    if resp.status_code >= 400:
        raise EOfficeAPIError(f"HTTP {resp.status_code}")

    data = resp.json()
    if isinstance(data, dict) and data.get("message") == "no privilege":
        return {"docs": [], "total": 0, "denied": True}

    docs = (
        data if isinstance(data, list)
        else data.get("data") or data.get("documents") or data.get("items") or []
    )
    total = data.get("total") or data.get("count") or 0 if isinstance(data, dict) else 0
    return {"docs": docs, "total": total, "denied": False}


async def check_token_valid(token: str, base_url: str = EOFFICE_BASE) -> bool:
    """Quick token validity check"""
    try:
        result = await fetch_saraban_list(token, drs="2", limit=1, base_url=base_url)
        return not result.get("denied", False)
    except TokenExpiredError:
        return False
    except Exception:
        return False
