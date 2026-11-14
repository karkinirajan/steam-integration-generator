import re

import pytest
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH

from app.core.exports import pdf_can_render, write_docx, write_pdf

SAMPLE = "**Engage**\n\nStart with *a question* about **water**.\n* first point\n* second point\n# Big heading"


class TestPdfCanRender:
    @pytest.mark.parametrize("text", ["plain ascii", "café naïve", "a – dash", "€5 and “quotes”", ""])
    def test_latin_text_is_fine(self, text):
        assert pdf_can_render(text)

    @pytest.mark.parametrize("text", ["नेपाली", "mixed न text", "\U0001f600", "中文"])
    def test_letters_the_built_in_fonts_lack_are_not(self, text):
        assert not pdf_can_render(text)


class TestDocx:
    @pytest.fixture
    def doc(self, tmp_path):
        path = tmp_path / "out.docx"
        write_docx(SAMPLE, path)
        return Document(str(path))

    def test_one_paragraph_per_line_including_blank_ones(self, doc):
        expected = ["Engage", "", "Start with a question about water.", "first point", "second point", "Big heading"]
        assert [p.text for p in doc.paragraphs] == expected

    def test_the_spaces_between_styled_words_survive(self, doc):
        assert doc.paragraphs[2].text == "Start with a question about water."

    def test_headings_are_bold_and_sized(self, doc):
        run = doc.paragraphs[0].runs[0]
        assert run.bold is True and run.font.size.pt == 12  # a bold line is a second-level heading
        assert doc.paragraphs[5].runs[0].font.size.pt == 14  # "# " is the first level

    def test_inline_bold_and_italic_become_runs(self, doc):
        runs = {r.text: (r.bold, r.italic) for r in doc.paragraphs[2].runs}
        assert runs["a question"] == (None, True)
        assert runs["water"] == (True, None)
        assert runs["Start with "] == (None, None)

    def test_bullets_use_the_bullet_style(self, doc):
        assert [p.style.name for p in doc.paragraphs[3:5]] == ["List Bullet", "List Bullet"]
        assert doc.paragraphs[2].style.name == "Normal"

    def test_text_is_justified_and_headings_are_not(self, doc):
        assert doc.paragraphs[2].alignment == WD_ALIGN_PARAGRAPH.JUSTIFY
        assert doc.paragraphs[0].alignment is None

    def test_the_normal_font_is_set(self, doc):
        assert doc.styles["Normal"].font.name == "Helvetica"
        assert doc.styles["Normal"].font.size.pt == 11

    def test_nepali_text_is_written_intact(self, tmp_path):
        path = tmp_path / "ne.docx"
        write_docx("**विषय**\nपाठ *नेपाली*", path)
        assert [p.text for p in Document(str(path)).paragraphs] == ["विषय", "पाठ नेपाली"]

    def test_an_empty_response_writes_a_valid_empty_document(self, tmp_path):
        path = tmp_path / "empty.docx"
        write_docx("", path)
        assert Document(str(path)).paragraphs == []


class TestPdf:
    def write(self, tmp_path, markdown, compress=False):
        path = tmp_path / "out.pdf"
        write_pdf(markdown, path, compress=compress)
        return path.read_bytes()

    def test_it_is_a_pdf(self, tmp_path):
        assert self.write(tmp_path, SAMPLE).startswith(b"%PDF-")

    def test_the_text_is_in_the_file(self, tmp_path):
        data = self.write(tmp_path, SAMPLE)
        for word in (b"Engage", b"first point", b"Big heading"):
            assert word in data

    def test_text_that_looks_like_markup_is_drawn_not_parsed(self, tmp_path):
        # unescaped, "<b> & </i>" made ReportLab raise a parse error; it emits the text in several pieces, so join them
        data = self.write(tmp_path, "Use <b> & </i> in text")
        drawn = b"".join(re.findall(rb"\(((?:[^()\\]|\\.)*)\) Tj", data))
        assert b"Use <b> & </i> in text" in drawn

    def test_bold_and_italic_select_the_matching_fonts(self, tmp_path):
        data = self.write(tmp_path, "plain **bold** and *slanted*")
        assert b"Helvetica-Bold" in data and b"Helvetica-Oblique" in data

    def test_a_first_level_heading_is_14_points_and_a_second_level_one_is_not(self, tmp_path):
        assert re.search(rb"/F\d+ 14 Tf", self.write(tmp_path, "# Big"))
        assert not re.search(rb"/F\d+ 14 Tf", self.write(tmp_path, "## Smaller"))

    def test_a_second_level_heading_is_12_points_and_body_text_is_11(self, tmp_path):
        assert len(re.findall(rb"/F\d+ 12 Tf", self.write(tmp_path, "## Smaller"))) >= 2  # the page default plus the heading
        assert len(re.findall(rb"/F\d+ 12 Tf", self.write(tmp_path, "body only"))) == 1  # the page default alone
        assert re.search(rb"/F\d+ 11 Tf", self.write(tmp_path, "body only"))

    def test_a_bullet_is_drawn_as_a_marker_with_the_text_indented_past_it(self, tmp_path):
        data = self.write(tmp_path, "* one point")
        marker, text = data.find(b"1 0 0 1 6 1 Tm"), data.find(b"1 0 0 1 18 1 Tm")  # bullet indent 6, left indent 18
        assert 0 < marker < text
        assert b"(one point) Tj" in data[text:]

    def test_plain_text_uses_neither(self, tmp_path):
        data = self.write(tmp_path, "just plain words")
        assert b"Helvetica-Bold" not in data and b"Helvetica-Oblique" not in data

    def test_a_long_response_runs_onto_more_pages(self, tmp_path):
        one = self.write(tmp_path, "short")
        many = self.write(tmp_path, "\n".join(f"Paragraph number {n} " + "words " * 40 for n in range(60)))
        pages = lambda data: len(re.findall(rb"/Type /Page(?!s)", data))  # noqa: E731
        assert pages(one) == 1 and pages(many) > 1

    def test_compression_is_the_default_and_makes_a_smaller_file(self, tmp_path):
        text = "\n".join(f"Paragraph {n} " + "words " * 30 for n in range(40))
        plain = self.write(tmp_path, text, compress=False)
        packed = self.write(tmp_path, text, compress=True)
        assert len(packed) < len(plain)

    def test_an_empty_response_still_writes_a_pdf(self, tmp_path):
        assert self.write(tmp_path, "").startswith(b"%PDF-")

    def test_a_path_object_or_a_string_both_work(self, tmp_path):
        write_pdf("x", str(tmp_path / "s.pdf"))
        write_pdf("x", tmp_path / "p.pdf")
        assert (tmp_path / "s.pdf").exists() and (tmp_path / "p.pdf").exists()
