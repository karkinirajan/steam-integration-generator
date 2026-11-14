"""The FastAPI application. Run with ``uv run fastapi dev app/main.py`` (development) or ``fastapi run`` (production)."""
from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.deps import KEY_HEADER
from app.api.routes import router


def allowed_origins() -> list[str]:
    """Browser origins allowed to call the API, from ALLOWED_ORIGINS (comma-separated). Defaults to the Next.js dev server."""
    raw = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


def create_app() -> FastAPI:
    app = FastAPI(title="STEAM Integration Generator API", version="2.0.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins(),
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", KEY_HEADER],
        expose_headers=["Content-Disposition"],
    )
    app.include_router(router)
    return app


app = create_app()
