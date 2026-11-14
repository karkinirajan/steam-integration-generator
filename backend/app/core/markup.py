"""Turn the model's light Markdown (``**bold**``, ``*italic*``, ``#`` headings, bullets) into lines of styled runs.

One parser feeds the on-screen text box, the DOCX export and the PDF export, so they cannot drift apart. The earlier code
stripped the markers when it displayed the text and then looked for them again when exporting, so exports lost all formatting.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

_INLINE = re.compile(r"\*\*(?=\S)(.+?)(?<=\S)\*\*|\*(?=[^\s*])(.+?)(?<=[^\s*])\*")
_HASH_HEADING = re.compile(r"^(#{1,6})\s+(.*)$")
_BOLD_LINE = re.compile(r"^\*\*(.+?)\*\*:?$")
_BULLET = re.compile(r"^[*\-•]\s+(.*)$")


@dataclass(frozen=True)
class Run:
    text: str
    bold: bool = False
    italic: bool = False


@dataclass(frozen=True)
class Line:
    kind: str  # "heading", "bullet", "text" or "blank"
    runs: tuple[Run, ...] = ()
    level: int = 0  # headings only: 1 is the largest


def parse_inline(text: str) -> tuple[Run, ...]:
    """Split a line into plain, bold and italic runs. An unmatched ``*`` stays as written."""
    runs: list[Run] = []
    position = 0
    for match in _INLINE.finditer(text):
        if match.start() > position:
            runs.append(Run(text[position : match.start()]))
        if match.group(1) is not None:
            runs.append(Run(match.group(1), bold=True))
        else:
            runs.append(Run(match.group(2), italic=True))
        position = match.end()
    if position < len(text):
        runs.append(Run(text[position:]))
    return tuple(runs)


def parse(text: str) -> list[Line]:
    """Parse the whole response into lines."""
    lines: list[Line] = []
    for raw in text.splitlines():
        stripped = raw.strip()
        if not stripped:
            lines.append(Line("blank"))
            continue
        heading = _HASH_HEADING.match(stripped)
        if heading:
            level = 1 if len(heading.group(1)) == 1 else 2
            lines.append(Line("heading", (Run(heading.group(2).replace("**", ""), bold=True),), level))
            continue
        bold_line = _BOLD_LINE.match(stripped)
        if bold_line:
            lines.append(Line("heading", (Run(bold_line.group(1), bold=True),), 2))
            continue
        bullet = _BULLET.match(stripped)
        if bullet:
            lines.append(Line("bullet", parse_inline(bullet.group(1))))
            continue
        lines.append(Line("text", parse_inline(stripped)))
    return lines
