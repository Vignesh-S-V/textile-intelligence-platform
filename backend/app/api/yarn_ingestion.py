"""
The only sanctioned way to write a row into `yarn_prices`.

Research (see data_pipeline/research/yarn_price_sources_research.md) found
no free, publicly accessible, real-time yarn-price source that can be
scraped without violating a paywall, membership wall, or explicit
terms-of-use restriction (Fibre2Fashion, EmergingTextiles, etc. are all
commercial/restricted). Government sources (Agmarknet, Office of the
Textile Commissioner) cover raw cotton and production volumes, not yarn
transaction prices.

Until a licensed commercial feed is integrated, the legitimate path for
getting a REAL, VERIFIED yarn price into the system is a human with
authorized access to a real source (a licensed subscription, a mill's own
published price list, a signed quote, etc.) recording it here with full
provenance. This endpoint enforces that every required field is present
and that the cited source URL is actually reachable -- it never invents,
estimates, or backfills a price, and it never accepts a submission that's
missing provenance.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.schema import DataSource, YarnMaster, YarnPrice

router = APIRouter()


class YarnPriceSubmission(BaseModel):
    yarn_name: str = Field(..., min_length=1)
    fiber_type: str = Field(..., min_length=1)
    count: str = Field(..., min_length=1)
    blend: str = Field(..., min_length=1)          # e.g. "100% Cotton", "PC 65/35"
    category: Optional[str] = None

    state: Optional[str] = None
    district: Optional[str] = None
    market: Optional[str] = None

    price: float
    currency: str = Field(..., min_length=1)
    price_unit: str = Field(..., min_length=1)      # e.g. "INR/kg"
    price_type: str = "Market"

    effective_date: datetime

    source_name: str = Field(..., min_length=1)
    source_url: str = Field(..., min_length=1)

    @field_validator("price")
    @classmethod
    def price_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("price must be a positive number")
        return v


def check_source_reachable(url: str) -> bool:
    """
    Confirms the cited source URL actually resolves, so a submission can't
    cite a fake/placeholder domain. This only checks reachability -- it
    never downloads or stores the page content (which would risk
    reproducing someone else's copyrighted/paywalled material).
    """
    try:
        with httpx.Client(timeout=10.0, follow_redirects=True) as client:
            resp = client.head(url)
            if resp.status_code >= 400:
                resp = client.get(url)
            return resp.status_code < 400
    except httpx.HTTPError:
        return False


def get_or_create_yarn(db: Session, s: YarnPriceSubmission) -> YarnMaster:
    yarn = db.query(YarnMaster).filter_by(
        yarn_name=s.yarn_name, count=s.count, blend=s.blend
    ).first()
    if yarn:
        return yarn
    yarn = YarnMaster(
        yarn_name=s.yarn_name,
        fiber_type=s.fiber_type,
        category=s.category or s.fiber_type,
        count=s.count,
        unit=s.price_unit,
        blend=s.blend,
    )
    db.add(yarn)
    db.flush()
    return yarn


def get_or_create_source(db: Session, source_name: str, source_url: str) -> DataSource:
    source = db.query(DataSource).filter_by(source_name=source_name).first()
    if source:
        return source
    source = DataSource(
        source_name=source_name,
        source_type="Manual-Verified",
        base_url=source_url,
        data_category="Yarn Price",
        status="Healthy",
        last_successful_fetch=datetime.now(timezone.utc),
    )
    db.add(source)
    db.flush()
    return source


@router.post("/api/yarn-prices/verified-entry")
def submit_verified_yarn_price(
    submission: YarnPriceSubmission,
    db: Session = Depends(get_db),
):
    if not check_source_reachable(submission.source_url):
        raise HTTPException(
            status_code=422,
            detail=(
                "source_url could not be verified as reachable. "
                "No price was stored -- a real, confirmable source is required."
            ),
        )

    yarn = get_or_create_yarn(db, submission)
    source = get_or_create_source(db, submission.source_name, submission.source_url)

    existing = db.query(YarnPrice).filter_by(
        yarn_id=yarn.yarn_id, source_id=source.id, effective_date=submission.effective_date,
        market=submission.market,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="A record for this yarn/source/date/market already exists.")

    price_row = YarnPrice(
        yarn_id=yarn.yarn_id,
        source_id=source.id,
        original_value=submission.price,
        original_unit=submission.price_unit,
        normalized_value=submission.price,
        normalized_unit=submission.price_unit,
        currency=submission.currency,
        state=submission.state,
        district=submission.district,
        market=submission.market,
        price_type=submission.price_type,
        effective_date=submission.effective_date,
        collected_at=datetime.now(timezone.utc),
        source_url=submission.source_url,
        confidence=None,
        is_verified=True,
    )
    db.add(price_row)
    db.commit()
    db.refresh(price_row)

    return {
        "stored": True,
        "verification_status": "Verified",
        "yarn_id": yarn.yarn_id,
        "price_id": price_row.price_id,
        "collected_at": price_row.collected_at,
    }
