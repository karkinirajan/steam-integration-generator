# Work done: modernisation pass

Done on 2026-11-12 on the local branch `chore/modernize` of this fork. Nothing has been pushed. This is the plain record: what was wrong, what changed, how it was checked, and what was **not** checked.

## What was wrong, and what changed

| Where | Found | Change |
| --- | --- | --- |
| Desktop | The model `gemini-pro` is not on Google's current model or deprecation lists, and the SDK `google-generativeai` is marked Inactive on PyPI. | `google-genai`, and `gemini-3.6-flash` (Stable on 2026-11-12), settable with `GEMINI_MODEL`. |
| Desktop | `requirements.txt` was a stale `pip freeze`: it lacked `reportlab` (imported by the app, so a fresh install failed on start), listed the unrelated `tk==0.1.0`, and `googletrans` pinned `httpx` 0.13.3. | `pyproject.toml` with three dependencies and a lock. |
| Desktop | Exports read the *displayed* text, from which the `**` and `*` markers had already been stripped, so bold and headings never reached the DOCX or PDF. | The response is kept as returned; one parser feeds the screen and both exports. |
| Desktop | The text display dropped the space after every styled word (the DOCX in `docs/samples` shows `STEAMIntegration`). | Fixed in the parser. |
| Desktop | PDF italics did `.replace("*", "<i>").replace("*", "</i>")` (the second call can never match, leaving unclosed tags), and text was not escaped, so `<` or `&` broke ReportLab. | Proper `<b>`/`<i>` pairs, text escaped. |
| Desktop | Empty learning outcomes passed validation (`"".split(",")` is a non-empty list), and class time was demanded even for Ideas, which do not use it. | `request.validate`: blanks dropped, time only for a lesson plan. |
| Desktop | Pressing Enter in the Age or Location field called `.focus_set()` on a `StringVar` and raised `AttributeError`. | Each field focuses the next widget. |
| Desktop | "Change API Key" opened a second `Tk()` root; widgets were updated from the worker thread. | A `Toplevel` dialog; the worker queues its result and the window polls it. |
| Desktop | Nepali was produced by translating with an unofficial endpoint. PDF export of Devanagari cannot work with the built-in fonts. | The model writes in the language directly. The PDF path detects text it cannot draw and offers DOCX. |
| Desktop | The key rule (exactly 39 characters starting `AIzaSy`) was a guess about the format. The README promised a `.env` that the code never read. | A shape check only; `GEMINI_API_KEY` pre-fills the dialog. |
| Web | The model `gemini-1.5-flash` is not on Google's current lists. | `gemini-3.6-flash`. |
| Web | The API key was in the request URL (`?key=`). | An `x-goog-api-key` header; a CORS preflight confirmed Google allows it from browser origins. |
| Web | The model's text was turned into HTML by regex and assigned to `innerHTML` unescaped, so HTML in the output (or in an echoed topic) ran as markup. | `format.js` escapes first, then formats. |
| Web | `---` anywhere became a rule, and arithmetic like `2 * 3 * 4` became italic. | Rules only on their own line; a delimiter must touch its text. |
| Repo | README said `python main.py` (the file is `steam.py`), a `.env`, a clone URL with `yourusername`, and linked a prebuilt `.exe` on Google Drive and a wiki owned by another account. | Rewritten; see the decisions below. `runtime.txt` (invalid, unused) was removed; `gg.docx` and `gg.pdf` (sample exports, unreferenced) moved to `docs/samples/`. |

Structure: one 641-line `steam.py` became a `src/steam_generator` package with the logic separated from the window, a `tests/` suite, a `docs/` guide and CI. `steam.py` stays as a thin entry point so `python steam.py` still works.

## How it was checked

| Check | Result |
| --- | --- |
| pytest | 166 passed on Python 3.11, 3.12, 3.13 and 3.14 |
| ruff, mypy | clean |
| `node --test web` | 19 passed |
| Python mutation checks | 70 of 70 killed (`tests/mutation/py_mutants.py`) |
| Web mutation checks | 18 of 18 killed (`tests/mutation/js_mutants.py`) |

Mutation checking found real gaps, fixed rather than the mutants dropped. The first Python run killed 65 of 70: no test proved the Nepali instruction is *added* to the prompt rather than replacing it, three emphasis-delimiter cases were untested, and a DOCX test compared against the heading-size constant it should have checked. The first web run killed 16 of 18 for similar reasons. Two defects of my own were caught on the way: `zip(..., strict=True)` on lists of different lengths, and a regex that made `** spaced **` italic around its own asterisks.

## Not checked

- **The Tkinter window.** The Tk library is missing on the test machine, so `app.py` was compiled, linted and type-checked but never run. Its logic was moved into tested modules, but run it once by hand.
- **A real Gemini call.** The service is tested against a fake client. No API key was used.
- **That the old model ids fail.** They are not on Google's current lists, but whether the API still serves them was not established.
- **CI** (it has not run on GitHub) and a **PyInstaller build** of `steam.py`.

## Decisions for you

1. **The prebuilt `.exe`** linked from the old README (a Google Drive file) was built from the old code and is not in this repository. I removed the link rather than keep an unverified binary. If you distribute one, rebuild it from this code.
2. **This is a fork** and the changes are extensive. Whether to offer any of them back to `rajat-ed/steam-integration-generator` is yours to decide. The About box still credits the original author, unchanged.
3. **The web page sends the user's key from the browser to Google.** That is how the original worked. A server-side proxy would keep keys off the client, at the cost of hosting something.
4. **PDF export of Nepali** needs a Devanagari font bundled with the app; I could not verify one here, so the app offers DOCX instead.
5. **To publish:** `git push -u origin chore/modernize`.
