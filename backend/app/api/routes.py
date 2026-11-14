"""The HTTP endpoints. Each one is a thin wrapper over ``app.core``: no prompt, validation or formatting logic lives here."""
from __future__ import annotations

import io
import json
from collections.abc import Callable, Iterator
from typing import Any

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import Response, StreamingResponse

from app.api.deps import GeminiKey
from app.api.schemas import ExportFormat, ExportIn, GenerateIn, Options, Rendered
from app.core.config import LANGUAGES, OUTPUT_TYPES, model_name
from app.core.exports import pdf_can_render, write_docx, write_pdf
from app.core.gemini import GeminiService, GenerationError
from app.core.markup import parse
from app.core.prompts import build_prompt
from app.core.request import InputError, validate

router = APIRouter(prefix="/api")

# Replaced in tests with a factory that returns a fake client; production builds the real genai.Client.
service_factory: Callable[[str], GeminiService] = GeminiService

MEDIA_TYPES = {
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "pdf": "application/pdf",
}


def _event(name: str, data: Any) -> str:
    return f"event: {name}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/options")
def options() -> Options:
    return Options(output_types=list(OUTPUT_TYPES), languages=list(LANGUAGES), model=model_name())


@router.post("/generate", response_class=StreamingResponse, responses={200: {"content": {"text/event-stream": {}}}})
def generate(body: GenerateIn, key: GeminiKey) -> StreamingResponse:
    """Stream the response as Server-Sent Events: ``chunk`` events with text, then one ``done`` event carrying the full text
    and its parsed lines, or one ``error`` event with a message written for the user."""
    try:
        request = validate(
            body.topic, body.outcomes, body.age_group, body.output_type, body.time_minutes, body.location, body.language
        )
    except InputError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from None

    prompt = build_prompt(
        request.topic,
        request.outcomes,
        request.age_group,
        request.output_type,
        request.time_minutes,
        request.location,
        request.language,
    )
    service = service_factory(key)

    def events() -> Iterator[str]:
        parts: list[str] = []
        try:
            for piece in service.stream(prompt):
                parts.append(piece)
                yield _event("chunk", piece)
        except GenerationError as exc:
            yield _event("error", str(exc))
            return
        text = "".join(parts)
        yield _event("done", Rendered(text=text, lines=parse(text)).model_dump())

    # X-Accel-Buffering stops Nginx holding the stream back until it ends.
    headers = {"Cache-Control": "no-store", "X-Accel-Buffering": "no"}
    return StreamingResponse(events(), media_type="text/event-stream", headers=headers)


@router.post("/export/{fmt}", response_class=Response, responses={200: {"content": {t: {} for t in MEDIA_TYPES.values()}}})
def export(fmt: ExportFormat, body: ExportIn) -> Response:
    buffer = io.BytesIO()
    if fmt == "pdf":
        if not pdf_can_render(body.text):
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_CONTENT,
                "PDF cannot show these letters (Nepali, for one). Export as DOCX instead.",
            )
        write_pdf(body.text, buffer)
    else:
        write_docx(body.text, buffer)
    return Response(
        buffer.getvalue(),
        media_type=MEDIA_TYPES[fmt],
        headers={"Content-Disposition": f'attachment; filename="steam-output.{fmt}"'},
    )
