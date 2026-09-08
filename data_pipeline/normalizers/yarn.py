import re

_KNOWN_FIBERS = {
    "cotton", "polyester", "viscose", "rayon", "nylon", "acrylic", "modal",
    "lyocell", "wool", "linen", "silk", "hemp",
}


def normalize_yarn_name(raw_name: str) -> str:
    return re.sub(r"\s+", " ", raw_name or "").strip()


def normalize_count(raw_count: str) -> str:
    """Normalizes '30 s' / '30S' / '30s' -> '30s'. Returns '' if unparseable — never guesses."""
    if not raw_count:
        return ""
    m = re.match(r"^\s*(\d+)\s*[sS]\s*$", raw_count.strip())
    return f"{m.group(1)}s" if m else raw_count.strip()


def detect_declared_fiber(raw_name: str) -> str | None:
    """
    Only returns a fiber when the source text explicitly names a known fiber.
    Returns None (never a default guess) when it cannot determine one —
    callers must store this as unclassified rather than defaulting to Cotton.
    """
    lower = (raw_name or "").lower()
    for fiber in _KNOWN_FIBERS:
        if fiber in lower:
            return fiber.capitalize()
    return None
