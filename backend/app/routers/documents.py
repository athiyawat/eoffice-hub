"""GET /api/documents — saraban document listing with filters"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.saraban_model import SarabanDocument
from app.schemas.document_schema import DocumentListResponse, DocumentRead

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    db: AsyncSession = Depends(get_db),
    status: str | None = Query(None, description="doc_rec_status filter"),
    urgency: str | None = Query(None, description="urgency_level filter"),
    category: str | None = Query(None, description="category filter"),
    search: str | None = Query(None, description="Full-text search in subject"),
    date_from: str | None = Query(None, description="send_date >="),
    date_to: str | None = Query(None, description="send_date <="),
    pending_only: bool = Query(False, description="Only pending (done_date IS NULL)"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    query = select(SarabanDocument)

    if status:
        query = query.where(SarabanDocument.doc_rec_status == status)
    if urgency:
        query = query.where(SarabanDocument.urgency_level == urgency)
    if category:
        query = query.where(SarabanDocument.category == category)
    if search:
        query = query.where(SarabanDocument.subject.ilike(f"%{search}%"))
    if date_from:
        query = query.where(SarabanDocument.send_date >= date_from)
    if date_to:
        query = query.where(SarabanDocument.send_date <= date_to)
    if pending_only:
        query = query.where(SarabanDocument.done_date == None)  # noqa: E711

    # Count total
    count_q = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_q)
    total = total_result.scalar() or 0

    # Paginate + order
    query = (
        query.order_by(
            SarabanDocument.urgency_level.desc(),
            SarabanDocument.send_date.desc().nullslast(),
        )
        .offset((page - 1) * limit)
        .limit(limit)
    )
    result = await db.execute(query)
    items = result.scalars().all()

    return DocumentListResponse(
        items=[DocumentRead.model_validate(item) for item in items],
        total=total,
        page=page,
        limit=limit,
    )
