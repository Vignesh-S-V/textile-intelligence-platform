from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text,
    UniqueConstraint, CheckConstraint
)
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime, timezone

Base = declarative_base()

class DataSource(Base):
    __tablename__ = 'data_sources'
    id = Column(Integer, primary_key=True)
    source_name = Column(String, nullable=False, unique=True)
    source_type = Column(String, nullable=False) # Govt, Market, Association
    base_url = Column(String, nullable=False)
    data_category = Column(String, nullable=False)
    last_successful_fetch = Column(DateTime(timezone=True), nullable=True)
    last_failed_fetch = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, default="Pending") # Healthy, Delayed, Failed
    reliability_score = Column(Float, nullable=True)

class YarnMaster(Base):
    __tablename__ = 'yarn_master'
    yarn_id = Column(Integer, primary_key=True)
    yarn_name = Column(String, nullable=False)
    fiber_type = Column(String, nullable=False)
    category = Column(String, nullable=False)
    count = Column(String, nullable=False)
    unit = Column(String, nullable=False)
    # e.g. "100% Cotton", "PC 65/35", "Poly-Viscose 60/40" -- required
    # provenance field for yarn price records; nullable only for legacy
    # rows created before this field existed.
    blend = Column(String, nullable=True)

    __table_args__ = (
        UniqueConstraint('yarn_name', 'count', 'blend', name='uq_yarn_identity'),
    )

class YarnPrice(Base):
    __tablename__ = 'yarn_prices'
    price_id = Column(Integer, primary_key=True)
    yarn_id = Column(Integer, ForeignKey('yarn_master.yarn_id'), nullable=False)
    source_id = Column(Integer, ForeignKey('data_sources.id'), nullable=False)

    # Normalization tracking
    original_value = Column(Float, nullable=False)
    original_unit = Column(String, nullable=False)
    normalized_value = Column(Float, nullable=False)
    normalized_unit = Column(String, nullable=False)
    currency = Column(String, nullable=False)

    # Location & Traceability
    state = Column(String, nullable=True)
    district = Column(String, nullable=True)
    market = Column(String, nullable=True)
    price_type = Column(String, nullable=False) # Mill, Market, Spot

    effective_date = Column(DateTime(timezone=True), nullable=False)
    collected_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    source_url = Column(String, nullable=False)
    confidence = Column(Float, nullable=True)

    # Explicit verification flag. A row may only be written with
    # is_verified=True by ingestion code that has confirmed the record came
    # from a live, confirmed source_url (see data_pipeline validation).
    # API layers and the forecast engine must filter on this column rather
    # than inferring "verified" from the mere presence of a row.
    is_verified = Column(Boolean, nullable=False, default=False)

    source = relationship("DataSource")

    __table_args__ = (
        # Prevent the same source from writing duplicate observations for
        # the same yarn/date/location combination.
        UniqueConstraint(
            'yarn_id', 'source_id', 'effective_date', 'market',
            name='uq_yarn_price_source_date_market'
        ),
        CheckConstraint('normalized_value > 0', name='ck_yarn_price_positive'),
    )


class RawMaterialPrice(Base):
    """
    Verified raw-material (e.g. raw cotton / kapas) mandi prices from
    government sources such as Agmarknet (data.gov.in). This is
    deliberately a SEPARATE table from YarnPrice: raw cotton price is not
    the same thing as spun yarn price, and conflating the two would itself
    be a form of fabricated/misleading data.
    """
    __tablename__ = 'raw_material_prices'
    id = Column(Integer, primary_key=True)
    source_id = Column(Integer, ForeignKey('data_sources.id'), nullable=False)

    commodity = Column(String, nullable=False)   # e.g. "Cotton"
    variety = Column(String, nullable=True)

    state = Column(String, nullable=False)
    district = Column(String, nullable=False)
    market = Column(String, nullable=False)

    min_price = Column(Float, nullable=True)
    max_price = Column(Float, nullable=True)
    modal_price = Column(Float, nullable=False)
    original_unit = Column(String, nullable=False)   # e.g. "Rs/Quintal"
    normalized_value = Column(Float, nullable=False) # normalized to Rs/kg
    normalized_unit = Column(String, nullable=False, default="INR/kg")

    arrival_date = Column(DateTime(timezone=True), nullable=False)
    collected_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    source_url = Column(String, nullable=False)
    is_verified = Column(Boolean, nullable=False, default=False)

    source = relationship("DataSource")

    __table_args__ = (
        UniqueConstraint(
            'source_id', 'commodity', 'variety', 'market', 'arrival_date',
            name='uq_raw_material_source_date_market'
        ),
        CheckConstraint('modal_price > 0', name='ck_raw_material_price_positive'),
    )


class LoomMaster(Base):
    __tablename__ = 'loom_master'
    loom_id = Column(Integer, primary_key=True)
    loom_name = Column(String, nullable=False)
    loom_type = Column(String, nullable=False)
    technology = Column(String, nullable=False)
    manufacturer = Column(String, nullable=True)

class LoomDistrictData(Base):
    __tablename__ = 'loom_district_data'
    id = Column(Integer, primary_key=True)
    state = Column(String, nullable=False)
    district = Column(String, nullable=False)
    loom_type = Column(String, nullable=False)
    loom_count = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    source_id = Column(Integer, ForeignKey('data_sources.id'), nullable=False)
