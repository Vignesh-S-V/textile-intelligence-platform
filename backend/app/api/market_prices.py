from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.schema import YarnPrice, YarnMaster, DataSource

router = APIRouter()


@router.get("/api/market-prices")
def list_market_prices(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    fiber: Optional[str] = None,
    state: Optional[str] = None,
    district: Optional[str] = None,
    count: Optional[str] = None,
    blend: Optional[str] = None,
    source_name: Optional[str] = None,
    verification_status: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
):
    """
    Returns only records that actually exist in the database. Never
    fabricates rows. If nothing matches, returns an empty list — the
    frontend is responsible for showing "No verified data available".
    """
    q = db.query(YarnPrice).join(YarnMaster).join(DataSource)

    if fiber:
        q = q.filter(YarnMaster.fiber_type == fiber)
    if state:
        q = q.filter(YarnPrice.state == state)
    if district:
        q = q.filter(YarnPrice.district == district)
    if count:
        q = q.filter(YarnMaster.count == count)
    if source_name:
        q = q.filter(DataSource.source_name == source_name)
    if verification_status:
        q = q.filter(YarnPrice.verification_status == verification_status)
    if date_from:
        q = q.filter(YarnPrice.effective_date >= date_from)
    if date_to:
        q = q.filter(YarnPrice.effective_date <= date_to)

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
