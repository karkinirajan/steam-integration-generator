from types import SimpleNamespace

import pytest
from google.genai import errors

from steam_generator.config import DEFAULT_MODEL
from steam_generator.gemini import MAX_DETAIL, GeminiService, GenerationError, describe_api_error

KEY = "test-key-" + "x" * 30


class FakeClient:
    """Stands in for genai.Client: remembers every call and replies, or raises, as told."""

    def __init__(self, text="generated", error=None):
        self.models = self
        self.calls: list[tuple[str, str]] = []
        self._text, self._error = text, error

    def generate_content(self, model, contents):
        self.calls.append((model, contents))
        if self._error:
            raise self._error
        return SimpleNamespace(text=self._text)


def service(client, **kwargs):
    made: list[str] = []

    def factory(key):
        made.append(key)
        return client

    svc = GeminiService(KEY, client_factory=factory, **kwargs)
    svc.made = made  # type: ignore[attr-defined]
    return svc


def api_error(code, message="boom", status="X"):
    return errors.APIError(code, {"error": {"message": message, "status": status}})


class TestDescribeApiError:
    def test_a_rejected_key(self):
        assert "API key was not accepted" in describe_api_error(400, "API key not valid. Please pass a valid API key.", "m")

    def test_a_key_message_is_matched_without_regard_to_case(self):
        assert "API key was not accepted" in describe_api_error(400, "Invalid Api Key", "m")

    def test_another_bad_request_shows_the_detail(self):
        assert describe_api_error(400, "prompt too long", "m") == "Gemini returned an error (400): prompt too long"

    @pytest.mark.parametrize("code", [401, 403])
    def test_unauthorised_names_the_code(self, code):
        assert f"error {code}" in describe_api_error(code, "x", "m") and "API key" in describe_api_error(code, "x", "m")

    def test_a_missing_model_names_it_and_the_setting(self):
        text = describe_api_error(404, "not found", "gemini-old")
        assert "'gemini-old'" in text and "GEMINI_MODEL" in text

    def test_rate_limits(self):
        assert "rate limit" in describe_api_error(429, "quota", "m").lower()

    @pytest.mark.parametrize("code", [500, 502, 503, 599])
    def test_server_errors(self, code):
        assert f"error {code}" in describe_api_error(code, "x", "m") and "Try again" in describe_api_error(code, "x", "m")

    def test_499_is_not_a_server_error(self):
        assert "Gemini returned an error (499)" in describe_api_error(499, "x", "m")

    def test_no_code_still_gives_a_message(self):
        assert describe_api_error(None, "weird", "m") == "Gemini returned an error (None): weird"

    def test_a_long_message_is_cut_and_newlines_removed(self):
        text = describe_api_error(418, "line one\nline two " + "z" * 1000, "m")
        assert "\n" not in text and len(text) < MAX_DETAIL + 60

    def test_a_missing_message_is_fine(self):
        assert describe_api_error(418, None, "m") == "Gemini returned an error (418): "


class TestGenerate:
    def test_it_returns_the_text(self):
        assert service(FakeClient("hello")).generate("prompt") == "hello"

    def test_it_sends_the_model_and_the_prompt(self):
        client = FakeClient()
        service(client, model="gemini-x").generate("the prompt")
        assert client.calls == [("gemini-x", "the prompt")]

    def test_the_default_model_comes_from_config(self, monkeypatch):
        monkeypatch.delenv("GEMINI_MODEL", raising=False)
        client = FakeClient()
        service(client).generate("p")
        assert client.calls[0][0] == DEFAULT_MODEL

    def test_the_client_is_made_once_with_the_trimmed_key(self):
        client = FakeClient()
        svc = GeminiService("  " + KEY + " \n", client_factory=lambda key: (made.append(key), client)[1])
        made: list[str] = []
        svc.generate("a")
        svc.generate("b")
        assert made == [KEY] and len(client.calls) == 2

    @pytest.mark.parametrize("text", [None, "", "   \n"])
    def test_no_text_is_an_error_naming_the_likely_cause(self, text):
        with pytest.raises(GenerationError, match="safety filter"):
            service(FakeClient(text)).generate("p")

    def test_an_api_error_becomes_a_friendly_message(self):
        with pytest.raises(GenerationError, match="not found") as caught:
            service(FakeClient(error=api_error(404, "models/x is not found")), model="x").generate("p")
        assert "'x'" in str(caught.value)

    def test_a_quota_error(self):
        with pytest.raises(GenerationError, match="rate limit"):
            service(FakeClient(error=api_error(429))).generate("p")

    def test_a_network_failure_names_only_its_kind(self):
        with pytest.raises(GenerationError, match=r"Could not reach the Gemini service \(ConnectionError\)"):
            service(FakeClient(error=ConnectionError("dns failure for host secret"))).generate("p")

    def test_the_original_exception_is_not_chained(self):
        # the original could carry request details; the user-facing error must stand alone
        with pytest.raises(GenerationError) as caught:
            service(FakeClient(error=api_error(500))).generate("p")
        assert caught.value.__cause__ is None and caught.value.__suppress_context__

    @pytest.mark.parametrize(
        "error", [api_error(400, "API key not valid"), api_error(403), ConnectionError(KEY), RuntimeError("x")]
    )
    def test_the_api_key_never_appears_in_an_error(self, error):
        with pytest.raises(GenerationError) as caught:
            service(FakeClient(error=error)).generate("p")
        assert KEY not in str(caught.value)

    def test_a_failure_to_make_the_client_is_not_swallowed(self):
        def broken(_key):
            raise ValueError("bad configuration")

        with pytest.raises(ValueError, match="bad configuration"):
            GeminiService(KEY, client_factory=broken).generate("p")


def test_the_model_property():
    assert service(FakeClient(), model="m1").model == "m1"
