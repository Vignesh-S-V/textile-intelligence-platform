from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.schema import YarnPrice, YarnMaster, DataSource

router = APIRouter()

# Only these verification statuses are returned to the public dashboard.
PUBLIC_STATUSES = ("VERIFIED", "PARTIALLY_VERIFIED")


@router.get("/api/market-prices")
def list_market_prices(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    fiber: Optional[str] = None,
    state: Optional[str] = None,
    district: Optional[str] = None,
    market: Optional[str] = None,
    count: Optional[str] = None,
    blend: Optional[str] = None,
    spinning_type: Optional[str] = None,
    yarn_name: Optional[str] = None,
    source_name: Optional[str] = None,
    verification_status: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
):
    """
    Returns only VERIFIED/PARTIALLY_VERIFIED records that actually exist in
    the database. Never fabricates rows. Empty list → frontend shows
    'No verified data available'.
    """
    from sqlalchemy import extract

    q = (
        db.query(YarnPrice)
        .join(YarnMaster)
        .join(DataSource)
        .filter(YarnPrice.verification_status.in_(PUBLIC_STATUSES))
    )

    if verification_status and verification_status in PUBLIC_STATUSES:
        q = q.filter(YarnPrice.verification_status == verification_status)

    if fiber:
        q = q.filter(YarnMaster.fiber_type == fiber)
    if state:
        q = q.filter(YarnPrice.state == state)
    if district:
        q = q.filter(YarnPrice.district == district)
    if market:
        q = q.filter(YarnPrice.market == market)
    if count:
        q = q.filter(YarnMaster.count == count)
    if blend:
        q = q.filter(YarnMaster.blend == blend)
    if spinning_type:
        q = q.filter(YarnMaster.spinning_type == spinning_type)
    if yarn_name:
        q = q.filter(YarnMaster.yarn_name == yarn_name)
    if source_name:
        q = q.filter(DataSource.source_name == source_name)
    if date_from:
        q = q.filter(YarnPrice.effective_date >= date_from)
    if date_to:
        q = q.filter(YarnPrice.effective_date <= date_to)
    if year:
        q = q.filter(extract("year", YarnPrice.effective_date) == year)
    if month:
        q = q.filter(extract("month", YarnPrice.effective_date) == month)

    total = q.count()
    rows = (
        q.order_by(YarnPrice.effective_date.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    def serialize(p: YarnPrice):
        return {
            "id": p.price_id,
            "state": p.state,
            "district": p.district,
            "market": p.market,
            "fiber": p.yarn.fiber_type,
            "yarn": p.yarn.yarn_name,
            "count": p.yarn.count,
            "spinning_type": p.yarn.spinning_type,
            "blend": p.yarn.blend,
            "price": p.normalized_value,
            "unit": p.normalized_unit,
            "currency": p.currency,
            "effective_date": p.effective_date,
            "verification_status": p.verification_status,
            "confidence": p.confidence,
            "source_name": p.source.source_name,
            "source_url": p.source_url,
            "collected_at": p.collected_at,
        }

    return {
        "page": page,
        "page_size": page_size,
        "total": total,
        "results": [serialize(r) for r in rows],
    }
