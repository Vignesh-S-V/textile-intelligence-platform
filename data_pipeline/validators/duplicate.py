def dedup_key(normalized_yarn_name: str, source_name: str, market: str,
              effective_date_iso: str, price_type: str, normalized_unit: str) -> str:
    """
    Must exactly mirror the DB's unique constraint
    (yarn_id, source_id, market, effective_date, price_type, normalized_unit)
    so in-process dedup and the DB constraint never disagree.
    """
    parts = [normalized_yarn_name, source_name, market or "", effective_date_iso, price_type, normalized_unit]
    return "|".join(p.strip().lower() for p in parts)
