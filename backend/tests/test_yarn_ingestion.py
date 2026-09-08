import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from datetime import datetime, timezone
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException

from app.models.schema import Base, YarnPrice, YarnMaster, DataSource
from app.api import yarn_ingestion
from app.api.yarn_ingestion import YarnPriceSubmission, submit_verified_yarn_price


def make_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    return Session()


VALID_PAYLOAD = dict(
    yarn_name="30s Combed Cotton",
    fiber_type="Cotton",
    count="30s",
    blend="100% Cotton",
    price=270.0,
    currency="INR",
    price_unit="INR/kg",
    effective_date=datetime.now(timezone.utc),
    source_name="Mill XYZ Published Price List",
    source_url="https://example-mill.example.com/price-list",
    state="Punjab", district="Ludhiana", market="Ludhiana",
)


def test_submission_rejects_missing_required_fields():
    payload = dict(VALID_PAYLOAD)
    del payload["blend"]
    with pytest.raises(ValidationError):
        YarnPriceSubmission(**payload)


def test_submission_rejects_non_positive_price():
    payload = dict(VALID_PAYLOAD)
    payload["price"] = 0
    with pytest.raises(ValidationError):
        YarnPriceSubmission(**payload)


def test_endpoint_rejects_unreachable_source_url(monkeypatch):
    monkeypatch.setattr(yarn_ingestion, "check_source_reachable", lambda url: False)
    db = make_session()
    submission = YarnPriceSubmission(**VALID_PAYLOAD)
    with pytest.raises(HTTPException) as exc_info:
        submit_verified_yarn_price(submission, db=db)
    assert exc_info.value.status_code == 422
    assert db.query(YarnPrice).count() == 0, "No row should be written when the source can't be confirmed"


def test_endpoint_stores_verified_price_with_full_provenance(monkeypatch):
    monkeypatch.setattr(yarn_ingestion, "check_source_reachable", lambda url: True)
    db = make_session()
    submission = YarnPriceSubmission(**VALID_PAYLOAD)
    result = submit_verified_yarn_price(submission, db=db)

    assert result["stored"] is True
    assert result["verification_status"] == "Verified"

    row = db.query(YarnPrice).one()
    assert row.is_verified is True
    assert row.source_url == VALID_PAYLOAD["source_url"]
    assert row.currency == "INR"

    yarn = db.query(YarnMaster).one()
    assert yarn.blend == "100% Cotton"

    source = db.query(DataSource).one()
    assert source.source_name == "Mill XYZ Published Price List"


def test_endpoint_rejects_duplicate_entry(monkeypatch):
    monkeypatch.setattr(yarn_ingestion, "check_source_reachable", lambda url: True)
    db = make_session()
    submission = YarnPriceSubmission(**VALID_PAYLOAD)
    submit_verified_yarn_price(submission, db=db)

    with pytest.raises(HTTPException) as exc_info:
        submit_verified_yarn_price(submission, db=db)
    assert exc_info.value.status_code == 409
