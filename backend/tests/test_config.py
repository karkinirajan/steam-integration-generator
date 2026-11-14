import pytest

from app.core import config
from app.core.config import DEFAULT_MODEL, api_key_from_env, looks_like_api_key, model_name

# Ids the application used before (not on Google's current lists) and one that Google lists as shut down.
OLD_IDS = {"gemini-pro", "gemini-1.5-flash", "gemini-2.0-flash"}


class TestModel:
    def test_the_default_is_not_an_old_model_id(self):
        assert DEFAULT_MODEL not in OLD_IDS

    def test_the_default_is_used_when_nothing_is_set(self, monkeypatch):
        monkeypatch.delenv("GEMINI_MODEL", raising=False)
        assert model_name() == DEFAULT_MODEL

    def test_the_environment_overrides_it(self, monkeypatch):
        monkeypatch.setenv("GEMINI_MODEL", "gemini-custom")
        assert model_name() == "gemini-custom"

    @pytest.mark.parametrize("value", ["", "   "])
    def test_a_blank_value_means_not_set(self, monkeypatch, value):
        monkeypatch.setenv("GEMINI_MODEL", value)
        assert model_name() == DEFAULT_MODEL

    def test_surrounding_spaces_are_trimmed(self, monkeypatch):
        monkeypatch.setenv("GEMINI_MODEL", "  gemini-custom \n")
        assert model_name() == "gemini-custom"


class TestKeyFromEnvironment:
    def test_empty_when_unset(self, monkeypatch):
        monkeypatch.delenv("GEMINI_API_KEY", raising=False)
        assert api_key_from_env() == ""

    def test_trimmed_when_set(self, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "  abc \n")
        assert api_key_from_env() == "abc"


class TestLooksLikeApiKey:
    def test_none_and_empty_are_not_keys(self):
        assert not looks_like_api_key(None)
        assert not looks_like_api_key("")
        assert not looks_like_api_key("   ")

    def test_a_typical_google_key_shape(self):
        assert looks_like_api_key("AIzaSy" + "A" * 33)

    def test_a_key_in_another_shape_is_not_rejected(self):
        # the old rule demanded exactly 39 characters starting AIzaSy; that was a guess about the format
        assert looks_like_api_key("k" * 40)
        assert looks_like_api_key("AQ.Ab8RN6-" + "x" * 30)

    def test_the_length_limits(self):
        assert not looks_like_api_key("a" * 19)
        assert looks_like_api_key("a" * 20)
        assert looks_like_api_key("a" * 256)
        assert not looks_like_api_key("a" * 257)

    def test_surrounding_whitespace_from_a_paste_is_allowed(self):
        assert looks_like_api_key("  " + "a" * 30 + "\n")

    @pytest.mark.parametrize("key", ["a" * 15 + " " + "b" * 15, "a" * 30 + "!", "a" * 30 + "/", "न" * 30])
    def test_spaces_and_odd_characters_are_not_keys(self, key):
        assert not looks_like_api_key(key)


def test_the_choices_match_what_the_form_offers():
    assert config.OUTPUT_TYPES == ("Ideas", "Lesson Plan")
    assert config.LANGUAGES == ("English", "Nepali")
