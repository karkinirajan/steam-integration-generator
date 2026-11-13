# Deliberate bugs in the Python package, one at a time: each (name, file, old text, new text) must make the pytest suite fail.
# Run from the repository root (the driver checks the suite is green first; do not edit the tree while it runs; each `old` must occur exactly once):
#   uv run python tests/mutation/mutate.py tests/mutation/py_mutants.py -- uv run pytest -x -q -p no:cacheprovider -W ignore::SyntaxWarning
#
# Not mutated: src/steam_generator/app.py (the Tkinter window needs a display and the Tk library, which the test machine lacked).
# Not listed, because it cannot change behaviour:
#  - markup.py: `match.group(1) is not None` -> `match.group(2) is None` (the two groups of the alternation are never both set or both empty).

CFG = "src/steam_generator/config.py"
REQ = "src/steam_generator/request.py"
PRM = "src/steam_generator/prompts.py"
MKP = "src/steam_generator/markup.py"
HIS = "src/steam_generator/history.py"
EXP = "src/steam_generator/exports.py"
GEM = "src/steam_generator/gemini.py"

M = [
    # --- config
    ("config: an old model id is the default", CFG, 'DEFAULT_MODEL = "gemini-3.6-flash"', 'DEFAULT_MODEL = "gemini-pro"'),
    ("config: the model setting is not trimmed", CFG, 'os.environ.get("GEMINI_MODEL", "").strip() or DEFAULT_MODEL', 'os.environ.get("GEMINI_MODEL", "") or DEFAULT_MODEL'),
    ("config: the key setting is not trimmed", CFG, 'os.environ.get("GEMINI_API_KEY", "").strip()', 'os.environ.get("GEMINI_API_KEY", "")'),
    ("config: keys of 10 characters are plausible", CFG, "{20,256}", "{10,256}"),
    ("config: keys of 300 characters are plausible", CFG, "{20,256}", "{20,300}"),
    ("config: a key only has to start well", CFG, "_KEY_SHAPE.fullmatch(key.strip())", "_KEY_SHAPE.match(key.strip())"),
    ("config: a pasted key keeps its spaces", CFG, "_KEY_SHAPE.fullmatch(key.strip())", "_KEY_SHAPE.fullmatch(key)"),
    ("config: the output types are reordered", CFG, 'OUTPUT_TYPES = ("Ideas", "Lesson Plan")', 'OUTPUT_TYPES = ("Lesson Plan", "Ideas")'),
    # --- request
    ("request: outcomes are not required", REQ, "if not topic or not outcomes or not age_group:", "if not topic or not age_group:"),
    ("request: age is not required", REQ, "if not topic or not outcomes or not age_group:", "if not topic or not outcomes:"),
    ("request: topic is not required", REQ, "if not topic or not outcomes or not age_group:", "if not outcomes or not age_group:"),
    ("request: any output type is accepted", REQ, "    if output_type not in OUTPUT_TYPES:\n", "    if False:\n"),
    ("request: any language is accepted", REQ, "    if language not in LANGUAGES:\n", "    if False:\n"),
    ("request: ideas need a time too", REQ, '    if output_type == "Lesson Plan":\n', "    if True:\n"),
    ("request: a lesson plan needs no time", REQ, "        if not time_text.strip():\n", "        if False:\n"),
    ("request: zero minutes is a lesson", REQ, "        if time_minutes <= 0:\n", "        if time_minutes < 0:\n"),
    ("request: a blank location stays blank", REQ, "location=location.strip() or DEFAULT_LOCATION,", "location=location or DEFAULT_LOCATION,"),
    ("request: blank outcomes are kept", REQ, 'for part in text.split(",") if part.strip()]', 'for part in text.split(",") if part]'),
    ("request: the topic is not trimmed", REQ, "    topic = topic.strip()\n", ""),
    ("request: the age is not trimmed", REQ, "    age_group = age_group.strip()\n", ""),
    # --- prompts
    ("prompts: english is matched exactly", PRM, 'if language.strip().lower() != "english":', 'if language != "English":'),
    ("prompts: the templates are swapped", PRM, 'if output_type == "Ideas":', 'if output_type != "Ideas":'),
    ("prompts: the language instruction replaces the prompt", PRM, "        prompt += (", "        prompt = ("),
    # --- markup
    ("markup: a hash heading keeps its bold marks", MKP, '.replace("**", "")', ""),
    ("markup: a second-level heading is the first level", MKP, "level = 1 if len(heading.group(1)) == 1 else 2", "level = 1 if len(heading.group(1)) == 1 else 1"),
    ("markup: a bold line is a first-level heading", MKP, "(Run(bold_line.group(1), bold=True),), 2))", "(Run(bold_line.group(1), bold=True),), 1))"),
    ("markup: a colon after a bold line stays", MKP, r'_BOLD_LINE = re.compile(r"^\*\*(.+?)\*\*:?$")', r'_BOLD_LINE = re.compile(r"^\*\*(.+?)\*\*$")'),
    ("markup: the bullet character is not a bullet", MKP, r'_BULLET = re.compile(r"^[*\-•]\s+(.*)$")', r'_BULLET = re.compile(r"^[*\-]\s+(.*)$")'),
    ("markup: a hyphen is not a bullet", MKP, r'_BULLET = re.compile(r"^[*\-•]\s+(.*)$")', r'_BULLET = re.compile(r"^[*•]\s+(.*)$")'),
    ("markup: blank lines are text", MKP, "        if not stripped:\n", "        if False:\n"),
    ("markup: indentation is kept", MKP, "        stripped = raw.strip()\n", "        stripped = raw.rstrip()\n"),
    ("markup: an empty run precedes a match at the start", MKP, "        if match.start() > position:\n", "        if match.start() >= position:\n"),
    ("markup: an empty run follows the last match", MKP, "    if position < len(text):\n", "    if position <= len(text):\n"),
    ("markup: bold may start with a space", MKP, r"\*\*(?=\S)(.+?)", r"\*\*(.+?)"),
    ("markup: italic may start with a space", MKP, r"\*(?=[^\s*])(.+?)", r"\*(.+?)"),
    ("markup: italic may end with a space", MKP, r"(?<=[^\s*])\*", r"\*"),
    # --- history
    ("history: six entries are kept", HIS, "MAX_ENTRIES = 5", "MAX_ENTRIES = 6"),
    ("history: the live list is returned", HIS, "return list(self._entries)", "return self._entries"),
    # --- exports
    ("exports: the PDF is limited to ASCII", EXP, 'text.encode("cp1252")', 'text.encode("ascii")'),
    ("exports: the PDF encoder accepts everything", EXP, 'text.encode("cp1252")', 'text.encode("utf-8")'),
    ("exports: the heading sizes are swapped", EXP, "HEADING_POINTS = {1: 14, 2: 12}", "HEADING_POINTS = {1: 12, 2: 14}"),
    ("exports: bullets are ordinary paragraphs", EXP, '"List Bullet" if line.kind == "bullet" else None', "None"),
    ("exports: the body font changes", EXP, 'normal.font.name = "Helvetica"', 'normal.font.name = "Arial"'),
    ("exports: the body size changes", EXP, "normal.font.size = Pt(11)", "normal.font.size = Pt(12)"),
    ("exports: bold is lost", EXP, "                part.bold = True\n", "                pass\n"),
    ("exports: italic is lost", EXP, "                part.italic = True\n", "                pass\n"),
    ("exports: headings are justified", EXP, '        if line.kind != "heading":\n            paragraph.alignment', "        if True:\n            paragraph.alignment"),
    ("exports: headings are not sized", EXP, "                part.font.size = Pt(HEADING_POINTS[line.level])\n", "                pass\n"),
    ("exports: blank lines are dropped", EXP, "            document.add_paragraph()\n            continue\n", "            continue\n"),
    ("exports: the PDF text is not escaped", EXP, "        text = escape(run.text)\n", "        text = run.text\n"),
    ("exports: bold is written as italic", EXP, 'text = f"<b>{text}</b>"', 'text = f"<i>{text}</i>"'),
    ("exports: italic is written as bold", EXP, 'text = f"<i>{text}</i>"', 'text = f"<b>{text}</b>"'),
    ("exports: the PDF is never compressed", EXP, "pageCompression=1 if compress else 0", "pageCompression=0"),
    ("exports: every heading is first level", EXP, "headings[line.level]", "headings[1]"),
    ("exports: a bullet has no indent", EXP, "leftIndent=18, bulletIndent=6", "leftIndent=0, bulletIndent=0"),
    # --- gemini
    ("gemini: any bad request is a key problem", GEM, 'if code == 400 and "api key" in detail.lower():', "if code == 400:"),
    ("gemini: the key match is case-sensitive", GEM, 'in detail.lower():', 'in detail:'),
    ("gemini: 403 is not an authorisation error", GEM, "if code in (401, 403):", "if code in (401,):"),
    ("gemini: 500 is not a server error", GEM, "code >= 500", "code > 500"),
    ("gemini: a missing model is not named", GEM, "The model '{model}' was not found.", "The model was not found."),
    ("gemini: details are not cut", GEM, "[:MAX_DETAIL]", ""),
    ("gemini: newlines stay in details", GEM, '.replace("\\n", " ")', ""),
    ("gemini: the client is rebuilt each time", GEM, "        if self._client is None:\n", "        if True:\n"),
    ("gemini: the key is not trimmed", GEM, "self._api_key = api_key.strip()", "self._api_key = api_key"),
    ("gemini: blank text is a result", GEM, "if not text or not text.strip():", "if not text:"),
    ("gemini: missing text is a result", GEM, "if not text or not text.strip():", "if text is None:"),
    ("gemini: API errors keep their cause", GEM, "exc.message, self._model)) from None", "exc.message, self._model)) from exc"),
    ("gemini: network errors are not caught", GEM, "        except Exception as exc:  #", "        except KeyError as exc:  #"),
    ("gemini: the prompt is not sent", GEM, "contents=prompt)", 'contents="")'),
    ("gemini: the model is not sent", GEM, "model=self._model, contents", 'model="x", contents'),
]
