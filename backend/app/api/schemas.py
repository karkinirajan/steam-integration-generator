"""Request and response bodies. Field limits keep one request from being arbitrarily large; the checks a teacher can act on
(empty fields, class time) stay in ``app.core.request`` so their messages are the same everywhere."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from app.core.markup import Line

MAX_FIELD = 500
# A long lesson plan is around 15,000 characters. PDF and DOCX writing is CPU-bound and /api/export needs no key, so the
# cap keeps one request to about a second of work (200,000 characters took up to 9 s).
MAX_TEXT = 50_000


class GenerateIn(BaseModel):
    topic: str = Field(max_length=MAX_FIELD)
    outcomes: str = Field(max_length=MAX_FIELD * 4, description="Comma-separated learning outcomes")
    age_group: str = Field(max_length=MAX_FIELD)
    output_type: str = Field(max_length=50)
    time_minutes: str = Field(default="", max_length=10, description="Class time in minutes; needed for a lesson plan")
    location: str = Field(default="", max_length=MAX_FIELD)
    language: str = Field(default="English", max_length=50)


class ExportIn(BaseModel):
    text: str = Field(min_length=1, max_length=MAX_TEXT)


class Options(BaseModel):
    output_types: list[str]
    languages: list[str]
    model: str


class Rendered(BaseModel):
    """The final event of a generation: the full text and the same line model the DOCX and PDF exports are built from."""

    text: str
    lines: list[Line]


ExportFormat = Literal["docx", "pdf"]
