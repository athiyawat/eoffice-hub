"""Core sweep service — ported from saraban_daily_sweep.js main flow"""
import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.config_service import get_config_value
from app.services.eoffice_client import (
    fetch_saraban_list, resolve_doc_state, TokenExpiredError
)
from app.services.ai_summarizer import (
    summarize_with_ai, map_urgency, format_summary_message
)
from app.services.telegram_service import send_telegram
from app.models.saraban_model import SarabanDocument
from app.models.run_log_model import RunLog


UPSERT_SQL = """
INSERT INTO saraban_documents (
    doc_id, original_doc_id, book_number, subject,
    sender_name, sender_dept, recipient_dept,
    urgency_level, category, bucket_id, doc_rec_status,
    have_file_group, send_date, add_date, done_date,
    deadline_at, summary_text, formatted_msg,
    meeting_info, action_items, has_action_required,
    eoffice_url, processed_at, backfill_version
) VALUES (
    :doc_id, :original_doc_id, :book_number, :subject,
    :sender_name, :sender_dept, :recipient_dept,
    :urgency_level, :category, :bucket_id, :doc_rec_status,
    :have_file_group, :send_date, :add_date, :done_date,
    :deadline_at, :summary_text, :formatted_msg,
    :meeting_info, :action_items, :has_action_required,
    :eoffice_url, NOW(), 'sweep_api'
)
ON CONFLICT (doc_id) DO UPDATE SET
    doc_rec_status  = EXCLUDED.doc_rec_status,
    done_date       = EXCLUDED.done_date,
    summary_text    = COALESCE(EXCLUDED.summary_text, saraban_documents.summary_text),
    formatted_msg   = COALESCE(EXCLUDED.formatted_msg, saraban_documents.formatted_msg),
    meeting_info    = COALESCE(EXCLUDED.meeting_info, saraban_documents.meeting_info),
    action_items    = COALESCE(EXCLUDED.action_items, saraban_documents.action_items),
    has_action_required = EXCLUDED.has_action_required,
    processed_at    = NOW(),
    updated_at      = NOW()
"""


def _build_report(new_docs: list, processed_data: list, sweep_time: datetime, drs: str) -> str:
    """Ported from buildReport() in saraban_daily_sweep.js"""
    from app.services.ai_summarizer import format_summary_message

    state_counts: dict[str, int] = {}
    for d in processed_data:
        lbl = d.get("state_label") or "(ไม่ระบุ)"
        state_counts[lbl] = state_counts.get(lbl, 0) + 1

    drs_label = " · ".join(f"{k}: {v}" for k, v in state_counts.items()) if state_counts else (
        {"1": "ขาออก", "2": "รอรับ", "3": "รอส่ง/พิจารณา"}.get(drs, f"drs={drs}")
    )

    date_str = sweep_time.strftime("%d/%m/%Y")
    time_str = sweep_time.strftime("%H:%M")

    if not processed_data:
        return f"📬 *รายงานสารบรรณ e-Office* — {date_str} {time_str} น.\n_ไม่มีหนังสือใหม่ ({drs_label})_"

    urgency_order = {"ด่วนที่สุด": 0, "ด่วนมาก": 1, "ด่วน": 2, "ปกติ": 3}
    sorted_docs = sorted(processed_data, key=lambda d: urgency_order.get(d.get("urgency_level", ""), 9))

    urgent_count = sum(1 for d in sorted_docs if d.get("urgency_level") != "ปกติ")
    meeting_count = sum(1 for d in sorted_docs if d.get("category") == "meeting")

    report = f"📬 *รายงานสารบรรณ e-Office* — {date_str} {time_str} น.\n"
    report += f"📊 หนังสือใหม่ ({drs_label}): *{len(sorted_docs)} ฉบับ*"
    if urgent_count:
        report += f" | 🚨 ด่วน: {urgent_count}"
    if meeting_count:
        report += f" | 📅 ประชุม: {meeting_count}"
    report += "\n\n" + "─" * 40 + "\n\n"

    for idx, doc in enumerate(sorted_docs):
        if doc.get("state_label"):
            action = doc.get("state_action") or ""
            report += doc["state_label"]
            if action and action != "-":
                report += f" → _{action}_"
            report += "\n"
        report += format_summary_message(doc)
        if idx < len(sorted_docs) - 1:
            report += "\n---\n\n"

    report += "\n" + "─" * 40
    report += f"\n🤖 _Saraban AutoSecretary | {datetime.now(timezone.utc).isoformat()}_"
    return report


async def run_sweep(
    db: AsyncSession,
    drs: str = "2",
    dry_run: bool = False,
    trigger: str = "api",
    auto_accept: bool = False,
) -> dict[str, Any]:
    """
    Main sweep flow:
    1. Load config (decrypt token + telegram)
    2. Check token validity
    3. Call e-Office API
    4. Dedup against DB
    5. AI summarize each new doc
    6. Upsert DB + run_logs
    7. Send Telegram
    """
    started_at = datetime.now(timezone.utc)
    run_log = RunLog(
        started_at=started_at,
        trigger=trigger,
        drs=drs,
        new_docs=0,
        status="running",
    )
    if not dry_run:
        db.add(run_log)
        await db.commit()
        await db.refresh(run_log)

    try:
        # 1. Load config
        token = await get_config_value(db, "eoffice_token")
        bot_token = await get_config_value(db, "telegram_bot_token")
        chat_id = await get_config_value(db, "telegram_chat_id")
        base_url = await get_config_value(db, "eoffice_base_url") or "https://eoffice.ntplc.co.th"
        bucket_id_str = await get_config_value(db, "eoffice_bucket_id") or "390"
        bucket_id = int(bucket_id_str)

        if not token:
            raise ValueError("eoffice_token not configured")

        # 2. Fetch API
        resp = await fetch_saraban_list(
            token=token, drs=drs, base_url=base_url, bucket_id=bucket_id
        )
        api_docs: list[dict] = resp.get("docs", [])

        # 3. Dedup
        api_doc_ids = [d.get("detailsend_id") for d in api_docs]
        if api_doc_ids:
            result = await db.execute(
                select(SarabanDocument.doc_id).where(
                    SarabanDocument.doc_id.in_(api_doc_ids)
                )
            )
            existing_ids = {row[0] for row in result.all()}
        else:
            existing_ids = set()

        new_docs = [d for d in api_docs if d.get("detailsend_id") not in existing_ids]

        # 4+5. Summarize and upsert
        processed_data: list[dict] = []
        for doc in new_docs:
            try:
                ai_result = await summarize_with_ai(doc, "")
                state = resolve_doc_state(doc)
                doc_data: dict[str, Any] = {
                    "doc_id": doc.get("detailsend_id"),
                    "original_doc_id": doc.get("doc_id"),
                    "book_number": doc.get("doc_no"),
                    "subject": doc.get("doc_header") or "",
                    "sender_name": doc.get("send_from"),
                    "sender_dept": (doc.get("bucket_start") or {}).get("bucket_name") or "",
                    "recipient_dept": doc.get("send_from_bucket"),
                    "urgency_level": map_urgency(doc.get("speed_name") or ""),
                    "category": ai_result.get("category", "information"),
                    "bucket_id": doc.get("bucket_id") or bucket_id,
                    "doc_rec_status": doc.get("doc_rec_status"),
                    "have_file_group": doc.get("have_file_group") or 0,
                    "send_date": doc.get("send_date"),
                    "add_date": doc.get("add_date"),
                    "done_date": doc.get("done_date"),
                    "deadline_at": ai_result.get("deadline_at") or doc.get("done_date"),
                    "summary_text": ai_result.get("summary_text"),
                    "meeting_info": json.dumps(ai_result.get("meeting_info") or {}),
                    "action_items": json.dumps(ai_result.get("action_items") or []),
                    "has_action_required": ai_result.get("has_action_required", False),
                    "eoffice_url": doc.get("eoffice_url"),
                    "state_label": f"{state['icon']} {state['label']}",
                    "state_action": state["action"],
                }
                doc_data["formatted_msg"] = format_summary_message(doc_data)

                if not dry_run:
                    await db.execute(text(UPSERT_SQL), doc_data)
                    await db.commit()

                processed_data.append(doc_data)
            except Exception as e:
                processed_data.append({"subject": doc.get("doc_header", ""), "error": str(e)})

        # 6. Telegram (only for รอรับ unless auto_accept)
        telegram_sent = False
        report = _build_report(new_docs, processed_data, started_at, drs)
        if not dry_run and bot_token and chat_id:
            # If drs=2 (รอรับ) — notify always
            # If auto_accept=True — also notify for other statuses
            should_notify = drs == "2" or auto_accept
            if should_notify:
                telegram_sent = await send_telegram(bot_token, chat_id, report)

        # 7. Update run_log
        finished_at = datetime.now(timezone.utc)
        if not dry_run and run_log.id:
            run_log.finished_at = finished_at
            run_log.new_docs = len(new_docs)
            run_log.status = "success"
            run_log.telegram_sent = telegram_sent
            await db.commit()

        return {
            "status": "success",
            "dry_run": dry_run,
            "api_docs_count": len(api_docs),
            "new_docs_count": len(new_docs),
            "telegram_sent": telegram_sent,
            "report_preview": report[:500],
            "run_log_id": run_log.id if not dry_run else None,
        }

    except TokenExpiredError:
        if not dry_run and run_log.id:
            run_log.status = "token_expired"
            run_log.error_msg = "e-Office token expired"
            run_log.finished_at = datetime.now(timezone.utc)
            await db.commit()
        # Notify via Telegram
        bot_token = await get_config_value(db, "telegram_bot_token")
        chat_id = await get_config_value(db, "telegram_chat_id")
        if bot_token and chat_id:
            await send_telegram(
                bot_token, chat_id,
                "⚠️ *e-Office Token หมดอายุ*\nระบบเลขาอัตโนมัติไม่สามารถดึงข้อมูลได้\nกรุณาอัปเดต token ผ่านหน้า Settings"
            )
        return {"status": "token_expired", "error": "e-Office token expired"}

    except Exception as exc:
        if not dry_run and run_log.id:
            run_log.status = "error"
            run_log.error_msg = str(exc)[:1000]
            run_log.finished_at = datetime.now(timezone.utc)
            await db.commit()
        return {"status": "error", "error": str(exc)}
