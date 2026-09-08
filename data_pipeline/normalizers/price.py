_DIRECTLY_COMPARABLE_UNITS = {"kg", "tonne"}


def normalize_price_unit(value: float, unit: str, known_conversion_kg: float | None = None):
    """
    Returns (normalized_value, normalized_unit).
    - kg/tonne convert to kg using standard fixed factors (these are units of
      mass, not package-size guesses).
    - cone/box/other package units are converted ONLY if the caller supplies
      the source-stated weight-per-package (known_conversion_kg). Otherwise
      the original unit is preserved unchanged — never silently equated to ₹/kg.
    """
    unit_l = (unit or "").strip().lower()

    if unit_l == "kg":
        return value, "kg"
    if unit_l == "tonne":
        return value / 1000.0, "kg"
    if unit_l in {"cone", "box"} and known_conversion_kg:
        return value / known_conversion_kg, "kg"

    return value, unit_l or "unknown"
