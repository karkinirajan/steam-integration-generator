import json
from typing import Any

import pytest
from docx import Document
from fastapi.testclient import TestClient
from google.genai import errors

from app.api import routes
from app.core.gemini import GeminiService
from app.main import allowed_origins, create_app

KEY = "test-key-" + "x" * 30
FORM = {"topic": "Volcanoes", "outcomes": "explain eruptions, model magma", "age_group": "10-12", "output_type": "Ideas"}


class FakeStreamClient:
    def __init__(self, pieces=("# Title\n", "Some **bold** text"), error=None):
        self.models = self
        self.calls: list[tuple[str, str]] = []
        self._pieces, self._error = pieces, error

    def generate_content_stream(self, model, contents):
        self.calls.append((model, contents))
        for piece in self._pieces:
            yield type("Chunk", (), {"text": piece})()
        if self._error:
            raise self._error


@pytest.fixture
def fake(monkeypatch):
    holder = {"client": FakeStreamClient(), "keys": []}

    def factory(key):
        holder["keys"].append(key)
        return GeminiService(key, client_factory=lambda _k: holder["client"])

    monkeypatch.setattr(routes, "service_factory", factory)
    return holder


@pytest.fixture
def client():
    return TestClient(create_app())


def events(body: str) -> list[tuple[str, Any]]:
    out = []
    for block in body.strip().split("\n\n"):
        name = block.split("\n")[0].removeprefix("event: ")
        data = json.loads(block.split("\n")[1].removeprefix("data: "))
        out.append((name, data))
    return out


def post(client, body=FORM, key: str | None = KEY):
    headers = {"X-Gemini-Key": key} if key is not None else {}
    return client.post("/api/generate", json=body, headers=headers)


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_options_lists_the_form_choices_and_model(client, monkeypatch):
    monkeypatch.setenv("GEMINI_MODEL", "gemini-test")
    assert client.get("/api/options").json() == {
        "output_types": ["Ideas", "Lesson Plan"],
        "languages": ["English", "Nepali"],
        "model": "gemini-test",
    }


class TestGenerate:
    def test_it_streams_chunks_then_the_parsed_result(self, client, fake):
        response = post(client)
        assert response.status_code == 200 and response.headers["content-type"].startswith("text/event-stream")
        got = events(response.text)
        assert got[:2] == [("chunk", "# Title\n"), ("chunk", "Some **bold** text")]
        name, done = got[2]
        assert name == "done" and done["text"] == "# Title\nSome **bold** text"
        assert done["lines"][0] == {"kind": "heading", "runs": [{"text": "Title", "bold": True, "italic": False}], "level": 1}
        assert [r["bold"] for r in done["lines"][1]["runs"]] == [False, True, False]

    def test_the_prompt_is_built_from_the_form(self, client, fake):
        post(client)
        prompt = fake["client"].calls[0][1]
        assert "Volcanoes" in prompt and "explain eruptions, model magma" in prompt

    def test_the_key_is_trimmed_and_used(self, client, fake):
        post(client, key=f"  {KEY}  ")
        assert fake["keys"] == [KEY]

    @pytest.mark.parametrize("key", [None, "", "short", "has spaces in it which is wrong"])
    def test_a_missing_or_mistyped_key_is_401(self, client, fake, key):
        response = post(client, key=key)
        assert response.status_code == 401 and "API key" in response.json()["detail"]
        assert fake["keys"] == []

    def test_an_incomplete_form_is_422_with_the_core_message(self, client, fake):
        response = post(client, body={**FORM, "topic": "  "})
        assert response.status_code == 422 and response.json()["detail"] == "Please fill in all fields."

    def test_a_lesson_plan_needs_a_time(self, client, fake):
        response = post(client, body={**FORM, "output_type": "Lesson Plan"})
        assert response.status_code == 422 and "class time" in response.json()["detail"]

    def test_an_oversized_field_is_rejected_before_the_model_is_called(self, client, fake):
        assert post(client, body={**FORM, "topic": "x" * 10_000}).status_code == 422
        assert fake["keys"] == []

    def test_a_mid_stream_failure_ends_with_an_error_event(self, client, fake):
        fake["client"] = FakeStreamClient(pieces=("partial",), error=errors.APIError(429, {"error": {"message": "q"}}))
        got = events(post(client).text)
        assert got[0] == ("chunk", "partial") and got[-1][0] == "error" and "rate limit" in got[-1][1]

    def test_an_empty_response_is_an_error_event(self, client, fake):
        fake["client"] = FakeStreamClient(pieces=("", "  "))
        assert events(post(client).text)[-1][0] == "error"

    def test_the_key_never_appears_in_the_response(self, client, fake):
        fake["client"] = FakeStreamClient(pieces=(), error=ConnectionError(KEY))
        assert KEY not in post(client).text


class TestExport:
    def test_docx(self, client, tmp_path):
        response = client.post("/api/export/docx", json={"text": "# Head\nbody"})
        assert response.status_code == 200 and "steam-output.docx" in response.headers["content-disposition"]
        path = tmp_path / "f.docx"
        path.write_bytes(response.content)
        assert [p.text for p in Document(str(path)).paragraphs] == ["Head", "body"]

    def test_pdf(self, client):
        response = client.post("/api/export/pdf", json={"text": "# Head\nbody"})
        assert response.status_code == 200 and response.content.startswith(b"%PDF-")
        assert response.headers["content-type"] == "application/pdf"

    def test_nepali_pdf_is_refused_with_a_hint(self, client):
        response = client.post("/api/export/pdf", json={"text": "नेपाली"})
        assert response.status_code == 422 and "DOCX" in response.json()["detail"]

    def test_nepali_docx_works(self, client):
        assert client.post("/api/export/docx", json={"text": "नेपाली"}).status_code == 200

    def test_an_unknown_format_is_422(self, client):
        assert client.post("/api/export/txt", json={"text": "x"}).status_code == 422

    def test_empty_text_is_422(self, client):
        assert client.post("/api/export/docx", json={"text": ""}).status_code == 422


class TestCors:
    def test_the_default_origin_is_the_dev_server(self, monkeypatch):
        monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)
        assert allowed_origins() == ["http://localhost:3000"]

    def test_origins_come_from_the_environment(self, monkeypatch):
        monkeypatch.setenv("ALLOWED_ORIGINS", " https://a.example , ,https://b.example")
        assert allowed_origins() == ["https://a.example", "https://b.example"]

    def test_a_preflight_allows_the_key_header(self, client):
        response = client.options(
            "/api/generate",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "x-gemini-key,content-type",
            },
        )
        assert response.status_code == 200 and "x-gemini-key" in response.headers["access-control-allow-headers"].lower()


def test_export_text_over_the_cap_is_refused(client):
    from app.api.schemas import MAX_TEXT

    assert client.post("/api/export/docx", json={"text": "a" * (MAX_TEXT + 1)}).status_code == 422
    assert client.post("/api/export/docx", json={"text": "a" * MAX_TEXT}).status_code == 200
