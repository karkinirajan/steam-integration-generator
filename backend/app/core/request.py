"""What the user typed, checked and turned into a request."""
from __future__ import annotations

from dataclasses import dataclass

from app.core.config import LANGUAGES, OUTPUT_TYPES

DEFAULT_LOCATION = "General Classroom Setting"


class InputError(ValueError):
    """The form is not filled in correctly; the message is written for the person at the keyboard."""


@dataclass(frozen=True)
class Request:
    topic: str
    outcomes: list[str]
    age_group: str
    output_type: str
    time_minutes: int | None
    location: str
    language: str


def parse_outcomes(text: str) -> list[str]:
    """Split comma-separated learning outcomes, dropping blanks and surrounding spaces."""
    return [part.strip() for part in text.split(",") if part.strip()]


def validate(
    topic: str,
    outcomes_text: str,
    age_group: str,
    output_type: str,
    time_text: str,
    location: str,
    language: str,
) -> Request:
    """Check the form. Class time is only needed (and only checked) for a lesson plan: the ideas prompt does not use it."""
    topic = topic.strip()
    age_group = age_group.strip()
    outcomes = parse_outcomes(outcomes_text)
    if not topic or not outcomes or not age_group:
        raise InputError("Please fill in all fields.")
    if output_type not in OUTPUT_TYPES:
        raise InputError("Choose an output type: " + " or ".join(OUTPUT_TYPES) + ".")
    if language not in LANGUAGES:
        raise InputError("Choose a language: " + " or ".join(LANGUAGES) + ".")

    time_minutes: int | None = None
    if output_type == "Lesson Plan":
        if not time_text.strip():
            raise InputError("Please provide a value for class time.")
        try:
            time_minutes = int(time_text.strip())
        except ValueError:
            raise InputError("Time must be a valid integer number.") from None
        if time_minutes <= 0:
            raise InputError("Time must be greater than zero.")

    return Request(
        topic=topic,
        outcomes=outcomes,
        age_group=age_group,
        output_type=output_type,
        time_minutes=time_minutes,
        location=location.strip() or DEFAULT_LOCATION,
        language=language,
    )
