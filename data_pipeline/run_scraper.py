"""
Main scraper entry point.

ENABLED_SOURCE_ADAPTERS is intentionally empty. The placeholder
gov_yarn_spider targets a fake domain and must NOT be enabled.

To add a real source:
1. Write a source adapter in data_pipeline/scrapers/ that targets a
   confirmed, legally accessible URL and actually contains yarn prices.
2. Import it here and add it to ENABLED_SOURCE_ADAPTERS.

See data_pipeline/research/yarn_price_sources_research.md for why no
free public source currently qualifies.
"""
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

# No verified real-time source is available without a commercial licence.
# Do NOT re-enable gov_yarn_spider — it uses a placeholder domain.
ENABLED_SOURCE_ADAPTERS: list = []


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
            "PIPELINE SUMMARY | "
            "sources_attempted=%s  sources_failed=%s | "
            "records_discovered=%s  records_parsed=%s  "
            "records_validated=%s  records_inserted=%s  "
            "records_skipped(dup)=%s  validation_failures=%s  "
            "db_writes=%s",
            self.sources_attempted,
            self.sources_failed,
            self.records_fetched,
            self.records_accepted + self.records_rejected,
            self.records_accepted,
            self.records_accepted - self.duplicates_skipped,
            self.duplicates_skipped,
            self.validation_failures,
            self.db_writes,
        )


def get_or_create_source(db, source_name, source_type, base_url, data_category):
    src = db.query(DataSource).filter_by(source_name=source_name).first()
    if src:
        return src
    src = DataSource(
        source_name=source_name,
        source_type=source_type,
        base_url=base_url,
        data_category=data_category,
        status="Healthy",
    )
    db.add(src)
    db.flush()
    return src


def get_or_create_yarn(db, yarn_name, fiber_type, category, count, unit):
    yarn = db.query(YarnMaster).filter_by(yarn_name=yarn_name, count=count).first()
    if yarn:
        return yarn
    yarn = YarnMaster(
        yarn_name=yarn_name,
        fiber_type=fiber_type,
        category=category,
        count=count,
        unit=unit,
    )
    db.add(yarn)
    db.flush()
    return yarn


def process_item(db, stats: PipelineStats, item: dict, source: DataSource):
    stats.records_fetched += 1

    validation = validate_price_record(item)
    if not validation.ok:
        stats.records_rejected += 1
        stats.validation_failures += 1
        log.warning("REJECTED record for %s: %s", item.get("yarn_name"), validation.reason)
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
        log.warning(
            "REJECTED: could not classify fiber from source text for '%s'", yarn_name
        )
        return

    yarn = get_or_create_yarn(
        db, yarn_name, fiber, item.get("category", "Unclassified"), count, norm_unit
    )

    key = dedup_key(
        yarn_name,
        source.source_name,
        item.get("market", ""),
        item["effective_date"],
        item["price_type"],
        norm_unit,
    )
    existing = (
        db.query(YarnPrice)
        .filter_by(
            yarn_id=yarn.yarn_id,
            source_id=source.id,
            market=item.get("market"),
            effective_date=item["effective_date"],
            price_type=item["price_type"],
            normalized_unit=norm_unit,
        )
        .first()
    )
    if existing:
        stats.duplicates_skipped += 1
        existing.normalized_value = norm_value
        existing.collected_at = datetime.now(timezone.utc)
        stats.db_writes += 1
        log.debug("SKIPPED (duplicate, updated value) %s", yarn_name)
        return

    price = YarnPrice(
        yarn_id=yarn.yarn_id,
        source_id=source.id,
        original_value=item["original_value"],
        original_unit=item["original_unit"],
        normalized_value=norm_value,
        normalized_unit=norm_unit,
        currency=item["currency"],
        state=state,
        district=district,
        market=item.get("market"),
        price_type=item["price_type"],
        effective_date=item["effective_date"],
        source_url=item["source_url"],
        confidence=item.get("confidence"),
        verification_status=item.get("verification_status", "UNVERIFIED"),
    )
    db.add(price)
    stats.records_accepted += 1
    stats.db_writes += 1
    log.info("INSERTED %s @ %s %s", yarn_name, item["original_value"], item["original_unit"])
    _ = key


def run():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        log.error(
            "DATABASE_URL is not set. Aborting — will not run against an unknown database."
        )
        sys.exit(1)

    # Normalise postgres:// → postgresql:// for SQLAlchemy 2.x
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)

    engine = create_engine(database_url, pool_pre_ping=True)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    stats = PipelineStats()

    if not ENABLED_SOURCE_ADAPTERS:
        log.warning(
            "No verified source adapters are enabled. "
            "No free publicly accessible real-time yarn-price source currently qualifies "
            "without violating a paywall or terms of service "
            "(see data_pipeline/research/yarn_price_sources_research.md). "
            "The pipeline will exit cleanly without inserting any records."
        )
        stats.report()
        db.close()
        return

    for adapter in ENABLED_SOURCE_ADAPTERS:
        stats.sources_attempted += 1
        log.info("Source: %s", getattr(adapter, "SOURCE_NAME", str(adapter)))
        try:
            source = get_or_create_source(
                db,
                adapter.SOURCE_NAME,
                adapter.SOURCE_TYPE,
                adapter.BASE_URL,
                adapter.DATA_CATEGORY,
            )
            items = list(adapter.fetch_items())
            log.info("Records discovered: %d", len(items))
            for item in items:
                process_item(db, stats, item, source)
            db.commit()
            log.info("Committed batch for %s", adapter.SOURCE_NAME)
        except Exception:
            db.rollback()
            stats.sources_failed += 1
            log.exception(
                "Source adapter failed: %s", getattr(adapter, "SOURCE_NAME", adapter)
            )

    stats.report()
    db.close()


if __name__ == "__main__":
    run()
