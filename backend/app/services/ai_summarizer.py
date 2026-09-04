"""AI summarizer — ported from saraban_ai.js
Calls OpenClaw Gateway (cc/claude-sonnet-4-6) with rule-based fallback.
"""
import json
import re
import httpx
from typing import Any

from app.config import settings


URGENCY_MAP = {
    "ปกติ": "ปกติ",
    "ด่วน": "ด่วน",
    "ด่วนมาก": "ด่วนมาก",
    "ด่วนที่สุด": "ด่วนที่สุด",
}


def map_urgency(speed_name: str) -> str:
    """Ported from mapUrgency() in saraban_ai.js"""
    return URGENCY_MAP.get(speed_name or "", "ปกติ")


def infer_category(subject: str, raw_text: str = "") -> str:
    """Ported from inferCategory() in saraban_ai.js"""
    text = (subject + " " + raw_text).lower()
    meeting_kw = ["ประชุม", "นัดหมาย", "เชิญประชุม", "zoom", "teams", "ประชุมออนไลน์"]
    action_kw = ["ขอให้", "มอบหมาย", "ดำเนินการ", "ส่งแบบ", "รายงานผล", "กรุณา"]
    anno_kw = ["ประชาสัมพันธ์", "แจ้งเวียน", "เพื่อทราบ", "แจ้งให้ทราบ"]
    if any(kw in text for kw in meeting_kw):
        return "meeting"
    if any(kw in text for kw in action_kw):
        return "action_required"
    if any(kw in text for kw in anno_kw):
        return "announcement"
    return "information"


def _extract_action_items(text: str) -> list[str]:
    items: list[str] = []
    patterns = [
        r"(?:ขอให้|โปรด|กรุณา|ให้)[^\n.]{10,150}",
        r"(?:\d+\.|[-•])\s+(?:ขอให้|จัด|ส่ง|รายงาน|เตรียม|ดำเนินการ)[^\n]{10,150}",
    ]
    for pat in patterns:
        for m in re.finditer(pat, text):
            item = m.group(0).strip()
            if len(item) > 10 and item not in items:
                items.append(item)
            if len(items) >= 5:
                break
    return items[:5]


def _extract_deadline(text: str) -> str | None:
    patterns = [
        r"ภายในวันที่\s*(\d{1,2}\s+\w+\s+\d{4})",
        r"ภายใน\s*(\d{1,2}\s+\w+\s+\d{4})",
        r"ส่งภายใน\s*(\d{1,2}\s+\w+\s+\d{4})",
        r"กำหนดส่ง\s*(\d{1,2}\s+\w+\s+\d{4})",
    ]
    for pat in patterns:
        m = re.search(pat, text)
        if m:
            return m.group(1)
    return None


def _fallback_summary(doc: dict[str, Any], raw_text: str = "") -> dict[str, Any]:
    subject = doc.get("doc_header") or doc.get("subject") or ""
    sender_dept = (doc.get("bucket_start") or {}).get("bucket_name") or doc.get("sender_dept") or ""
    speed = doc.get("speed_name") or "ปกติ"
    category = infer_category(subject, raw_text)
    sender_name = doc.get("send_from") or ""

    if category == "meeting":
        summary = f"[{speed}] เชิญประชุมเรื่อง \"{subject}\" จาก {sender_dept}"
    elif category == "action_required":
        summary = f"[{speed}] มอบหมายงาน/ขอให้ดำเนินการ: \"{subject}\" จาก {sender_dept}"
    elif category == "announcement":
        summary = f"[{speed}] แจ้งเวียน: \"{subject}\" โดย {sender_dept}"
    else:
        summary = f"[{speed}] \"{subject}\" ส่งโดย {sender_name} ({sender_dept})"

    action_items = _extract_action_items(raw_text)
    deadline = _extract_deadline(raw_text)

    return {
        "summary_text": summary,
        "category": category,
        "has_action_required": category == "action_required" or len(action_items) > 0,
        "action_items": action_items,
        "meeting_info": {},
        "deadline_at": deadline,
        "source": "rule-based",
    }


async def summarize_with_ai(doc: dict[str, Any], raw_text: str = "") -> dict[str, Any]:
    """
    Ported from summarizeWithAI() in saraban_ai.js
    Calls OpenClaw Gateway; fallback to rule-based on failure.
    """
    subject = doc.get("doc_header") or doc.get("subject") or ""
    sender_dept = (doc.get("bucket_start") or {}).get("bucket_name") or ""
    speed = doc.get("speed_name") or "ปกติ"
    truncated_text = raw_text[:3000] if raw_text else ""

    prompt = f"""คุณเป็นเลขานุการอัตโนมัติของ NT PLC วิเคราะห์หนังสือสารบรรณนี้และตอบกลับ **เฉพาะ JSON** ตามรูปแบบด้านล่างเท่านั้น ห้ามเพิ่มข้อความอื่น:

ข้อมูลหนังสือ:
- เลขที่: {doc.get("doc_no") or "ไม่มี"}
- ความเร่งด่วน: {speed}
- หัวเรื่อง: {subject}
- จากหน่วยงาน: {sender_dept}
- เนื้อหาเอกสาร (ถ้ามี):
{truncated_text or "(ไม่มีเนื้อหา PDF — ใช้เฉพาะ header)"}

ตอบกลับเป็น JSON (ห้ามมีข้อความอื่น):
{{
  "summary_text": "สรุปสาระสำคัญ 2-4 ประโยค",
  "category": "meeting|action_required|announcement|information",
  "has_action_required": true|false,
  "action_items": ["รายการที่ต้องดำเนินการ"],
  "meeting_info": {{
    "datetime": "วันเวลาประชุม หรือ null",
    "channel_or_location": "ห้องประชุม/ช่องทางออนไลน์ หรือ null",
    "agenda": ["วาระ 1", "วาระ 2"],
    "preparation": "สิ่งที่ต้องเตรียม หรือ null"
  }},
  "deadline_at": "YYYY-MM-DD หรือ null"
}}"""

    try:
        api_base = settings.OPENCLAW_API_BASE
        api_key = settings.OPENCLAW_API_KEY
        headers: dict[str, str] = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        payload = {
            "model": "omniroute/cc/claude-sonnet-4-6",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 800,
            "temperature": 0.1,
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{api_base}/v1/chat/completions",
                json=payload,
                headers=headers,
            )
        if resp.status_code == 200:
            content = resp.json().get("choices", [{}])[0].get("message", {}).get("content", "")
            json_match = re.search(r"\{[\s\S]*\}", content)
            if json_match:
                result = json.loads(json_match.group(0))
                result["source"] = "ai"
                return result
    except Exception:
        pass  # fallback below

    return _fallback_summary(doc, raw_text)


def format_summary_message(doc: dict[str, Any]) -> str:
    """
    Ported from formatSummaryMessage() in saraban_ai.js
    Returns Markdown-formatted message for Telegram/UI
    """
    urgency_icon = {
        "ด่วนที่สุด": "🔴",
        "ด่วนมาก": "🟠",
        "ด่วน": "🟡",
    }.get(doc.get("urgency_level") or "", "📄")

    type_tag = {
        "meeting": "เชิญประชุม",
        "action_required": "มอบหมายงาน",
        "announcement": "ประชาสัมพันธ์",
    }.get(doc.get("category") or "", "แจ้งเพื่อทราบ")

    msg = f"### {urgency_icon} [{doc.get('urgency_level','ปกติ')} | {type_tag}] {doc.get('subject','')}\n"
    msg += f"* **เลขที่หนังสือ:** `{doc.get('book_number') or '-'}` | **จาก:** {doc.get('sender_dept') or '-'}\n"
    msg += f"* **วันที่รับ:** {doc.get('send_date') or '-'}\n\n"
    msg += f"#### 📝 สาระสำคัญ:\n> {doc.get('summary_text') or '-'}\n\n"

    meeting_info = doc.get("meeting_info") or {}
    if doc.get("category") == "meeting" and meeting_info:
        msg += "#### 📌 ข้อมูลการประชุม:\n"
        if meeting_info.get("datetime"):
            msg += f"* **วัน-เวลา:** {meeting_info['datetime']}\n"
        if meeting_info.get("channel_or_location"):
            msg += f"* **สถานที่/ช่องทาง:** {meeting_info['channel_or_location']}\n"
        agenda = meeting_info.get("agenda") or []
        if agenda:
            msg += "* **วาระหลัก:**\n"
            for a in agenda:
                msg += f"  - {a}\n"
        if meeting_info.get("preparation"):
            msg += f"* **⚡ สิ่งที่ต้องเตรียม:** {meeting_info['preparation']}\n"
        msg += "\n"

    action_items = doc.get("action_items") or []
    if action_items:
        msg += "#### ⚡ สิ่งที่ต้องทำ:\n"
        for idx, item in enumerate(action_items):
            msg += f"* [ ] {idx+1}. {item}\n"
        msg += "\n"

    if doc.get("deadline_at"):
        msg += f"⏰ **Deadline:** {doc['deadline_at']}\n"
    if doc.get("eoffice_url"):
        msg += f"🔗 [เปิดใน e-Office]({doc['eoffice_url']})\n"

    return msg
