_KNOWN_MARKETS = {
    "surat": ("Surat", "Gujarat"),
    "coimbatore": ("Coimbatore", "Tamil Nadu"),
    "ahmedabad": ("Ahmedabad", "Gujarat"),
    "ludhiana": ("Ludhiana", "Punjab"),
    "erode": ("Erode", "Tamil Nadu"),
    "panipat": ("Panipat", "Haryana"),
    "bhiwandi": ("Bhiwandi", "Maharashtra"),
    "ichalkaranji": ("Ichalkaranji", "Maharashtra"),
    "bhilwara": ("Bhilwara", "Rajasthan"),
    "tirunelveli": ("Tirunelveli", "Tamil Nadu"),
    "salem": ("Salem", "Tamil Nadu"),
    "kolkata": ("Kolkata", "West Bengal"),
    "delhi": ("Delhi", "Delhi"),
    "tiruppur": ("Tiruppur", "Tamil Nadu"),
}


def normalize_location(raw_text: str) -> tuple[str | None, str | None]:
    """
    Returns (district, state) ONLY when explicitly named in raw_text.
    Returns (None, None) otherwise — callers must store NULL, never a
    fallback location, per the no-manufactured-geography rule.
    """
    lower = (raw_text or "").lower()
    for key, (district, state) in _KNOWN_MARKETS.items():
        if key in lower:
            return district, state
    return None, None
