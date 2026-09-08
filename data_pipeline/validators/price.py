from datetime import datetime, timezone


class ValidationResult:
    def __init__(self, ok: bool, reason: str = "", flag_for_review: bool = False):
        self.ok = ok
        self.reason = reason
        self.flag_for_review = flag_for_review


def validate_price_record(record: dict, previous_value: float | None = None) -> ValidationResult:
    """
    Rejects records that cannot be real. Flags (does not delete) records
    that are merely suspicious, per the no-silent-deletion rule.
    """
    price = record.get("original_value")
    unit = record.get("original_unit")
    currency = record.get("currency")
    effective_date = record.get("effective_date")

    if price is None:
        return ValidationResult(False, "missing price")
    if price <= 0:
        return ValidationResult(False, f"non-positive price: {price}")
    if not unit:
        return ValidationResult(False, "missing unit — cannot compare kg vs cone/box blindly")
    if not currency:
        return ValidationResult(False, "missing currency")
    if not effective_date:
        return ValidationResult(False, "missing effective_date")

    try:
        dt = effective_date if isinstance(effective_date, datetime) else datetime.fromisoformat(effective_date)
        if dt.tzinfo is None:
            return ValidationResult(False, "effective_date missing timezone")
        if dt > datetime.now(timezone.utc):
            return ValidationResult(False, "effective_date is in the future")
    except (ValueError, TypeError):
        return ValidationResult(False, f"unparseable effective_date: {effective_date}")

    # Sudden jump vs last known value for the same yarn/market/unit -> flag, don't drop.
    if previous_value and previous_value > 0:
        change_ratio = abs(price - previous_value) / previous_value
        if change_ratio > 0.5:
            return ValidationResult(True, f"price moved {change_ratio:.0%} vs last observation", flag_for_review=True)

    return ValidationResult(True)
