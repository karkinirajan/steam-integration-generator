# 3. Testing and quality

## Suites

| Suite | Run | Covers |
| --- | --- | --- |
| Python | `uv run pytest -q` | Settings, form validation, prompts, the Markdown parser, history, the DOCX and PDF writers (the DOCX is read back with python-docx; the PDF content stream is inspected), and the Gemini service against a fake client. No test touches the network. |
| Web | `node --test web` | `format.js`: escaping, the XSS cases, bold and italic edge cases, code, rules, line breaks. |
| Lint and types | `uv run ruff check .` and `uv run mypy src` | The whole repository. |

## Mutation checks

A passing suite only shows the tests agree with the code. `tests/mutation/` checks they would **disagree** if the code were wrong: it applies one deliberate bug at a time and the suite must fail for each.

```sh
uv run python tests/mutation/mutate.py tests/mutation/py_mutants.py -- uv run pytest -x -q -p no:cacheprovider -W ignore::SyntaxWarning
uv run python tests/mutation/mutate.py tests/mutation/js_mutants.py -- node --test web
```

The driver needs the suite to pass first, needs each pattern to match exactly once, and restores the files in a `finally` block: never kill it, and do not edit the tree while it runs. A survivor is a missing test or redundant code; fix the cause. The first Python run left five survivors, all missing assertions (for example, a test compared against the very constant it should have checked), and they were fixed.

## CI

`.github/workflows/ci.yml` runs ruff, mypy and pytest on Python 3.11 to 3.14, and the web tests on Node 26.

## Not tested

The Tkinter window (`app.py`) needs a display and the Tk library, so it has no automated test and was not run when it was rewritten. Its logic was moved out into the modules above so that little remains in it: layout, menus, the dialog and the queue polling. Run the app once by hand after any change to it.
