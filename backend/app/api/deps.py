"""The caller's own Gemini key, read from a header. It is used for one call and never logged or stored."""
from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Header, HTTPException, status

from app.core.config import looks_like_api_key

KEY_HEADER = "X-Gemini-Key"


def gemini_key(x_gemini_key: Annotated[str | None, Header(alias=KEY_HEADER)] = None) -> str:
    if not looks_like_api_key(x_gemini_key):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Enter a Gemini API key. It looks missing or mistyped.")
    assert x_gemini_key is not None  # narrowed by looks_like_api_key
    return x_gemini_key.strip()


GeminiKey = Annotated[str, Depends(gemini_key)]
