import pytest

from app.core.markup import Line, Run, parse, parse_inline


def runs(text):
    return [(r.text, r.bold, r.italic) for r in parse_inline(text)]


class TestInline:
    def test_plain_text(self):
        assert runs("just words") == [("just words", False, False)]

    def test_bold_and_italic(self):
        assert runs("a **b** c *d* e") == [("a ", False, False), ("b", True, False), (" c ", False, False),
                                           ("d", False, True), (" e", False, False)]

    def test_the_spaces_around_styled_words_survive(self):
        # the old display code dropped them, so words ran together ("STEAMIntegration")
        assert "".join(r.text for r in parse_inline("word **bold** word *it* end")) == "word bold word it end"

    def test_adjacent_styles(self):
        assert runs("**a***b*") == [("a", True, False), ("b", False, True)]

    def test_a_lone_asterisk_stays(self):
        assert runs("5 * 3") == [("5 * 3", False, False)]

    def test_arithmetic_with_two_asterisks_is_not_italic(self):
        assert runs("2 * 3 * 4") == [("2 * 3 * 4", False, False)]

    def test_an_unclosed_bold_stays_as_written(self):
        assert runs("an **unclosed") == [("an **unclosed", False, False)]

    def test_empty_text_has_no_runs(self):
        assert parse_inline("") == ()

    def test_two_bold_spans_stay_separate(self):
        assert [r.text for r in parse_inline("**a** and **b**") if r.bold] == ["a", "b"]

    @pytest.mark.parametrize("text", ["** spaced **", "** open**", "**close **", "* open*", "*close *", "a * b*", "a *b *"])
    def test_a_delimiter_must_touch_its_text(self, text):
        assert runs(text) == [(text, False, False)]


class TestLines:
    def test_blank_lines(self):
        assert parse("a\n\n   \nb") == [Line("text", (Run("a"),)), Line("blank"), Line("blank"), Line("text", (Run("b"),))]

    @pytest.mark.parametrize(
        ("source", "level"), [("# Big", 1), ("## Smaller", 2), ("### Smaller still", 2), ("###### Deepest", 2)]
    )
    def test_hash_headings(self, source, level):
        (line,) = parse(source)
        assert (line.kind, line.level) == ("heading", level)

    def test_a_hash_heading_loses_its_marks_and_is_bold(self):
        (line,) = parse("## Title with **bold**")
        assert line.runs == (Run("Title with bold", bold=True),)

    def test_a_line_that_is_all_bold_is_a_heading(self):
        (line,) = parse("**Engage**")
        assert (line.kind, line.level, line.runs) == ("heading", 2, (Run("Engage", bold=True),))

    def test_a_trailing_colon_after_a_bold_line_is_dropped(self):
        (line,) = parse("**Materials Needed**:")
        assert line.kind == "heading" and line.runs[0].text == "Materials Needed"

    def test_bold_followed_by_text_is_not_a_heading(self):
        (line,) = parse("**Title:** the description")
        assert line.kind == "text"
        assert [r.bold for r in line.runs] == [True, False]

    @pytest.mark.parametrize("marker", ["* ", "- ", "• "])
    def test_bullets(self, marker):
        (line,) = parse(marker + "item")
        assert (line.kind, line.runs) == ("bullet", (Run("item"),))

    def test_a_bullet_keeps_its_inline_styles(self):
        (line,) = parse("* **Goal:** learn")
        assert line.kind == "bullet" and line.runs[0] == Run("Goal:", bold=True)

    def test_a_star_with_no_space_is_not_a_bullet(self):
        (line,) = parse("*italic line*")
        assert line.kind == "text" and line.runs == (Run("italic line", italic=True),)

    def test_a_hash_without_a_space_is_text(self):
        assert parse("#hashtag")[0].kind == "text"

    def test_indented_lines_are_trimmed(self):
        assert parse("    * nested")[0].kind == "bullet"

    def test_windows_line_endings(self):
        assert [line.kind for line in parse("a\r\nb\r\n")] == ["text", "text"]

    def test_a_realistic_response(self):
        lines = parse("**Title**\n\nIntro with *emphasis*.\n\n* one\n* two")
        assert [line.kind for line in lines] == ["heading", "blank", "text", "blank", "bullet", "bullet"]
