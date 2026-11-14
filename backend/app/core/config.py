"""Settings: which model to call, and what a plausible API key looks like."""
from __future__ import annotations

import os
import re

# Listed as Stable, with no shutdown date announced, on Google's model list on 2026-11-12. The ids this application used before
# (`gemini-pro` in the desktop app, `gemini-1.5-flash` in the web page) appear on neither Google's models page nor its
# deprecations page, so they cannot be relied on; `gemini-2.0-flash` is listed there as shut down.
# Override with the GEMINI_MODEL environment variable.
DEFAULT_MODEL = "gemini-3.6-flash"

OUTPUT_TYPES = ("Ideas", "Lesson Plan")
LANGUAGES = ("English", "Nepali")

# Only a typo check: the service decides whether a key is valid. The earlier rule (exactly 39 characters starting with
# "AIzaSy") was a guess about the key format and would reject any key issued in another shape.
_KEY_SHAPE = re.compile(r"[A-Za-z0-9_.\-]{20,256}")


def model_name() -> str:
    """The model to call: GEMINI_MODEL if set, else the default."""
    return os.environ.get("GEMINI_MODEL", "").strip() or DEFAULT_MODEL


def api_key_from_env() -> str:
    """A key supplied through GEMINI_API_KEY, or an empty string."""
    return os.environ.get("GEMINI_API_KEY", "").strip()


def looks_like_api_key(key: str | None) -> bool:
    """True when the text has the shape of a key (no spaces, a plausible length). It does not prove the key works."""
    return key is not None and _KEY_SHAPE.fullmatch(key.strip()) is not None
