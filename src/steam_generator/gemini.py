"""The Gemini call, with errors turned into messages a teacher can act on."""
from __future__ import annotations

import warnings
from collections.abc import Callable
from typing import Any

from steam_generator.config import model_name

# google-genai (3.2.0, still in 3.3.0) has invalid "\/" escapes in its own types.py. Python reports them as a
# SyntaxWarning the first time it compiles that file, so the first run after an install printed two warnings.
# The filter is limited to this import and to that one message; any other warning still shows.
with warnings.catch_warnings():
    warnings.filterwarnings("ignore", message=r".*invalid escape sequence", category=SyntaxWarning)
    from google import genai
    from google.genai import errors

MAX_DETAIL = 300


class GenerationError(Exception):
    """The request failed; the message is safe and useful to show the user (it never contains the API key)."""


def describe_api_error(code: int | None, message: str | None, model: str) -> str:
    detail = (message or "").strip().replace("\n", " ")[:MAX_DETAIL]
    if code == 400 and "api key" in detail.lower():
        return "The API key was not accepted. Check it under API > Change API Key."
    if code in (401, 403):
        return f"The API key is missing, invalid, or not allowed to use this model (error {code})."
    if code == 404:
        return f"The model '{model}' was not found. Set GEMINI_MODEL to a model your key can use."
    if code == 429:
        return "The rate limit or quota was reached. Wait a minute and try again, or check your plan's limits."
    if code is not None and code >= 500:
        return f"The Gemini service had a problem (error {code}). Try again shortly."
    return f"Gemini returned an error ({code}): {detail}"


def _default_client(api_key: str) -> Any:
    return genai.Client(api_key=api_key)


class GeminiService:
    def __init__(self, api_key: str, model: str | None = None, client_factory: Callable[[str], Any] | None = None) -> None:
        self._api_key = api_key.strip()
        self._model = model or model_name()
        self._factory = client_factory or _default_client
        self._client: Any = None

    @property
    def model(self) -> str:
        return self._model

    def generate(self, prompt: str) -> str:
        if self._client is None:
            self._client = self._factory(self._api_key)
        try:
            response = self._client.models.generate_content(model=self._model, contents=prompt)
        except errors.APIError as exc:
            raise GenerationError(describe_api_error(exc.code, exc.message, self._model)) from None
        except Exception as exc:  # network and transport failures: report the kind, never the details
            kind = type(exc).__name__
            raise GenerationError(f"Could not reach the Gemini service ({kind}). Check your internet connection.") from None
        text = getattr(response, "text", None)
        if not text or not text.strip():
            raise GenerationError("The model returned no text (a safety filter may have blocked it). Try rewording the topic.")
        return str(text)
