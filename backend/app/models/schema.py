from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text
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
    
    source = relationship("DataSource")

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
