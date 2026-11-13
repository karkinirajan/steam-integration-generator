"""Write a response to a DOCX or PDF file, with its bold, italic, headings and bullets."""
from __future__ import annotations

from pathlib import Path
from xml.sax.saxutils import escape

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Pt
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

from steam_generator.markup import Line, parse

HEADING_POINTS = {1: 14, 2: 12}


def pdf_can_render(text: str) -> bool:
    """False when the text has letters the PDF's built-in fonts cannot draw (Nepali, for one). DOCX has no such limit."""
    try:
        text.encode("cp1252")
    except UnicodeEncodeError:
        return False
    return True


def write_docx(markdown: str, path: str | Path) -> None:
    document = Document()
    normal = document.styles["Normal"]
    normal.font.name = "Helvetica"
    normal.font.size = Pt(11)
    for line in parse(markdown):
        if line.kind == "blank":
            document.add_paragraph()
            continue
        paragraph = document.add_paragraph(style="List Bullet" if line.kind == "bullet" else None)
        for run in line.runs:
            part = paragraph.add_run(run.text)
            if run.bold:
                part.bold = True
            if run.italic:
                part.italic = True
            if line.kind == "heading":
                part.font.size = Pt(HEADING_POINTS[line.level])
        if line.kind != "heading":
            paragraph.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    document.save(str(path))


def _pdf_markup(line: Line) -> str:
    """ReportLab paragraph markup for a line, with the text escaped so that ``<`` and ``&`` cannot break it."""
    parts = []
    for run in line.runs:
        text = escape(run.text)
        if run.bold:
            text = f"<b>{text}</b>"
        if run.italic:
            text = f"<i>{text}</i>"
        parts.append(text)
    return "".join(parts)


def write_pdf(markdown: str, path: str | Path, compress: bool = True) -> None:
    sheet = getSampleStyleSheet()
    headings = {
        1: ParagraphStyle("Heading14", parent=sheet["Heading1"], fontSize=HEADING_POINTS[1], spaceAfter=12),
        2: ParagraphStyle("Heading12", parent=sheet["Heading2"], fontSize=HEADING_POINTS[2], spaceAfter=10),
    }
    body = ParagraphStyle("Body", parent=sheet["Normal"], fontSize=11, spaceAfter=8)
    bullet = ParagraphStyle("Bullet", parent=body, leftIndent=18, bulletIndent=6)
    story: list[Paragraph | Spacer] = []
    for line in parse(markdown):
        if line.kind == "blank":
            story.append(Spacer(1, 6))
        elif line.kind == "heading":
            story.append(Paragraph(_pdf_markup(line), headings[line.level]))
        elif line.kind == "bullet":
            story.append(Paragraph(_pdf_markup(line), bullet, bulletText="•"))
        else:
            story.append(Paragraph(_pdf_markup(line), body))
    SimpleDocTemplate(str(path), pagesize=letter, pageCompression=1 if compress else 0).build(story)
