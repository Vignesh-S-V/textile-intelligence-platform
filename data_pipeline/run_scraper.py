import logging
import os
import sys
from datetime import datetime, timezone

_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(_REPO_ROOT, "backend"))
sys.path.insert(0, _REPO_ROOT)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.schema import Base, DataSource, YarnMaster, YarnPrice

from data_pipeline.normalizers.yarn import normalize_yarn_name, normalize_count, detect_declared_fiber
from data_pipeline.normalizers.location import normalize_location
from data_pipeline.normalizers.price import normalize_price_unit
from data_pipeline.validators.price import validate_price_record
from data_pipeline.validators.duplicate import dedup_key

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("run_scraper")

# Register only source adapters that are verified real and technically
# accessible. gov_yarn_spider currently targets a placeholder domain and
# is intentionally NOT enabled here until a real, confirmed URL is supplied.
ENABLED_SOURCE_ADAPTERS = []


class PipelineStats:
    def __init__(self):
        self.sources_attempted = 0
        self.sources_failed = 0
        self.records_fetched = 0
        self.records_accepted = 0
        self.records_rejected = 0
        self.duplicates_skipped = 0
        self.validation_failures = 0
        self.db_writes = 0

    def report(self):
        log.info(
            "PIPELINE SUMMARY | sources_attempted=%s sources_failed=%s "
            "fetched=%s accepted=%s rejected=%s duplicates_skipped=%s "
            "validation_failures=%s db_writes=%s",
            self.sources_attempted, self.sources_failed, self.records_fetched,
            self.records_accepted, self.records_rejected, self.duplicates_skipped,
            self.validation_failures, self.db_writes,
        )


def get_or_create_source(db, source_name, source_type, base_url, data_category):
    src = db.query(DataSource).filter_by(source_name=source_name).first()
    if src:
        return src
    src = DataSource(
        source_name=source_name, source_type=source_type,
        base_url=base_url, data_category=data_category, status="Healthy",
    )
    db.add(src)
    db.flush()
    return src


def get_or_create_yarn(db, yarn_name, fiber_type, category, count, unit):
    yarn = db.query(YarnMaster).filter_by(yarn_name=yarn_name, count=count).first()
    if yarn:
        return yarn
    yarn = YarnMaster(yarn_name=yarn_name, fiber_type=fiber_type, category=category, count=count, unit=unit)
    db.add(yarn)
    db.flush()
    return yarn


def process_item(db, stats: PipelineStats, item: dict, source: DataSource):
    stats.records_fetched += 1

    validation = validate_price_record(item)
    if not validation.ok:
        stats.records_rejected += 1
        stats.validation_failures += 1
        log.warning("rejected record for %s: %s", item.get("yarn_name"), validation.reason)
        return

    effective_date = item["effective_date"]
    if isinstance(effective_date, str):
        effective_date = datetime.fromisoformat(effective_date)
    item["effective_date"] = effective_date

    yarn_name = normalize_yarn_name(item["yarn_name"])
    count = normalize_count(item.get("count", ""))
    fiber = detect_declared_fiber(yarn_name)
    district, state = normalize_location(item.get("raw_location", "") or yarn_name)
    norm_value, norm_unit = normalize_price_unit(
        item["original_value"], item["original_unit"], item.get("known_conversion_kg")
    )

    if fiber is None:
        stats.records_rejected += 1
        log.warning("rejected: could not classify fiber from source text for '%s'", yarn_name)
        return

    yarn = get_or_create_yarn(db, yarn_name, fiber, item.get("category", "Unclassified"), count, norm_unit)

    key = dedup_key(yarn_name, source.source_name, item.get("market", ""),
                     item["effective_date"], item["price_type"], norm_unit)
    existing = (
        db.query(YarnPrice)
        .filter_by(yarn_id=yarn.yarn_id, source_id=source.id, market=item.get("market"),
                    effective_date=item["effective_date"], price_type=item["price_type"],
                    normalized_unit=norm_unit)
        .first()
    )
    if existing:
        stats.duplicates_skipped += 1
        existing.normalized_value = norm_value
        existing.collected_at = datetime.now(timezone.utc)
        stats.db_writes += 1
        return

    price = YarnPrice(
        yarn_id=yarn.yarn_id, source_id=source.id,
        original_value=item["original_value"], original_unit=item["original_unit"],
        normalized_value=norm_value, normalized_unit=norm_unit, currency=item["currency"],
        state=state, district=district, market=item.get("market"),
        price_type=item["price_type"], effective_date=item["effective_date"],
        source_url=item["source_url"], confidence=item.get("confidence"),
        verification_status=item.get("verification_status", "UNVERIFIED"),
    )
    db.add(price)
    stats.records_accepted += 1
    stats.db_writes += 1
    _ = key  # reserved for future in-batch dedup before hitting the DB


def run():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        log.error("DATABASE_URL is not set. Aborting — will not run against an unknown database.")
        sys.exit(1)

    engine = create_engine(database_url, pool_pre_ping=True)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    stats = PipelineStats()

    if not ENABLED_SOURCE_ADAPTERS:
        log.warning(
            "No verified source adapters are enabled yet. "
            "gov_yarn_spider.py targets a placeholder domain and must be "
            "pointed at a real, confirmed Ministry of Textiles / TEXPROCIL "
            "URL (and enabled in ENABLED_SOURCE_ADAPTERS) before this runs for real."
        )
        stats.report()
        db.close()
        return

    for adapter in ENABLED_SOURCE_ADAPTERS:
        stats.sources_attempted += 1
        try:
            source = get_or_create_source(
                db, adapter.SOURCE_NAME, adapter.SOURCE_TYPE, adapter.BASE_URL, adapter.DATA_CATEGORY
            )
            for item in adapter.fetch_items():
                process_item(db, stats, item, source)
            db.commit()
        except Exception:
            db.rollback()
            stats.sources_failed += 1
            log.exception("source adapter failed: %s", getattr(adapter, "SOURCE_NAME", adapter))

    stats.report()
    db.close()


if __name__ == "__main__":
    run()
