from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import distinct, extract

from app.core.database import get_db
from app.models.schema import YarnPrice, YarnMaster

router = APIRouter()

VERIFIED_STATUSES = ("VERIFIED", "PARTIALLY_VERIFIED")


@router.get("/api/filter-metadata")
def get_filter_metadata(db: Session = Depends(get_db)):
    base = (
        db.query(YarnPrice)
        .join(YarnMaster)
        .filter(YarnPrice.verification_status.in_(VERIFIED_STATUSES))
    )

    def distinct_non_null(col):
        return sorted(
            v for (v,) in base.with_entities(distinct(col)).all() if v is not None
        )

    states    = distinct_non_null(YarnPrice.state)
    districts = distinct_non_null(YarnPrice.district)
    fibers    = distinct_non_null(YarnMaster.fiber_type)
    counts    = distinct_non_null(YarnMaster.count)
    spinning  = distinct_non_null(YarnMaster.spinning_type)
    blends    = distinct_non_null(YarnMaster.blend)
    yarns     = distinct_non_null(YarnMaster.yarn_name)
    markets   = distinct_non_null(YarnPrice.market)

    years = sorted(
        {
            int(y)
            for (y,) in base.with_entities(
                extract("year", YarnPrice.effective_date)
            ).all()
            if y is not None
        },
        reverse=True,
    )
    months = sorted(
        {
            int(m)
            for (m,) in base.with_entities(
                extract("month", YarnPrice.effective_date)
            ).all()
            if m is not None
        }
    )

    return {
        "states": states,
        "districts": districts,
        "fibers": fibers,
        "counts": counts,
        "spinning_types": spinning,
        "blends": blends,
        "yarns": yarns,
        "markets": markets,
        "years": years,
        "months": months,
    }
