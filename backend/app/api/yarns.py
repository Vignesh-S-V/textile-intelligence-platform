from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.schema import YarnPrice, YarnMaster
from app.ml.forecast_engine import ForecastEngine

router = APIRouter()

@router.get("/api/yarn-prices/current/{yarn_id}")
def get_current_price(yarn_id: int, db: Session = Depends(get_db)):
    price_record = db.query(YarnPrice)\
        .filter(YarnPrice.yarn_id == yarn_id)\
        .order_by(YarnPrice.effective_date.desc())\
        .first()
        
    if not price_record:
        return {
            "available": False,
            "message": "Data unavailable — no verified source found.",
            "data": None
        }
        
    return {
        "available": True,
        "data": {
            "price": price_record.normalized_value,
            "unit": price_record.normalized_unit,
            "currency": price_record.currency,
            "effective_date": price_record.effective_date,
            "source": price_record.source.source_name,
            "source_url": price_record.source_url,
            "collected_at": price_record.collected_at
        }
    }

@router.get("/api/yarn-forecast/{yarn_id}")
def get_yarn_forecast(yarn_id: int, db: Session = Depends(get_db)):
    engine = ForecastEngine(db)
    return engine.generate_6_month_forecast(yarn_id)
