"""Turn the model's light Markdown (``**bold**``, ``*italic*``, ``#`` headings, bullets) into lines of styled runs.

One parser feeds the on-screen text box, the DOCX export and the PDF export, so they cannot drift apart. The earlier code
stripped the markers when it displayed the text and then looked for them again when exporting, so exports lost all formatting.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

# The inline rules as a regex. parse_inline implements them in linear time; tests/test_markup.py checks the two agree.
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


def _next_closers(text: str) -> tuple[list[int], list[int]]:
    """For every index k, the first closing ``**`` (bold) and closing ``*`` (italic) at or after k, or -1.

    A closer must follow a character that is not a space (italic: nor a ``*``). Built right to left in one pass, so finding
    the closer for any opener is a lookup. A regex with a lazy ``.+?`` re-scans the rest of the line from every unclosed
    opener, which is quadratic: a 160,000-character line of ``*a *a ...`` took over a minute.
    """
    n = len(text)
    bold, italic = [-1] * (n + 2), [-1] * (n + 2)
    for k in range(n - 1, 0, -1):
        before = text[k - 1]
        bold[k] = k if text.startswith("**", k) and not before.isspace() else bold[k + 1]
        italic[k] = k if text[k] == "*" and not before.isspace() and before != "*" else italic[k + 1]
    return bold, italic


def parse_inline(text: str) -> tuple[Run, ...]:
    """Split a line into plain, bold and italic runs. An unmatched ``*`` stays as written.

    The rules are those of ``_INLINE``, scanned left to right with bold tried before italic at each position: an opener must
    touch its text, a closer must too, and the first closer after at least one character of content wins. Linear time.
    """
    bold_close, italic_close = _next_closers(text)
    runs: list[Run] = []
    position = start = 0
    n = len(text)
    while start < n:
        if text[start] != "*":
            start += 1
            continue
        after = text[start + 2] if start + 2 < n else ""
        if text.startswith("**", start) and after and not after.isspace():
            close = bold_close[start + 3] if start + 3 <= n else -1
            if close != -1:
                if start > position:
                    runs.append(Run(text[position:start]))
                runs.append(Run(text[start + 2 : close], bold=True))
                position = start = close + 2
                continue
        after = text[start + 1] if start + 1 < n else ""
        if after and not after.isspace() and after != "*":
            close = italic_close[start + 2] if start + 2 <= n else -1
            if close != -1:
                if start > position:
                    runs.append(Run(text[position:start]))
                runs.append(Run(text[start + 1 : close], italic=True))
                position = start = close + 1
                continue
        start += 1
    if position < n:
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
