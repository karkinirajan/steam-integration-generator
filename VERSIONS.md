# Versions

What the project runs on and how each version was checked (2026-11-12). Where something could not be verified, it says so.

## Runtimes and tooling

| Component | Version | Where | Notes |
| --- | --- | --- | --- |
| Python | 3.14 default; 3.11 to 3.14 tested | `.python-version`, `requires-python >=3.11` | The suite passes on 3.11, 3.12, 3.13 and 3.14. `google-genai` itself requires 3.11 or newer. |
| Node.js | 26 | `.nvmrc`, CI | Only for the web page's tests (`node --test web`). Run locally on 26.13.0. |
| uv | 0.13.7 | the lock was made with it | |
| GitHub Actions | `checkout@v7`, `setup-node@v7`, `setup-uv@v10.3.3` | `.github/workflows/ci.yml` | The latest majors on 2026-11-12. setup-uv has no floating `v10` tag, so it is pinned to the full version. |

## Dependencies (`uv.lock`, 44 packages)

| Package | Locked | Role |
| --- | --- | --- |
| `google-genai` | 3.2.0 | The Gemini SDK |
| `python-docx` | 1.2.0 | DOCX export |
| `reportlab` | 5.1.0 | PDF export |
| `pytest` | 9.2.0 | tests (dev) |
| `ruff` | 0.17.4 | lint (dev) |
| `mypy` | 2.4.1 | types (dev) |

Declared floors equal these tested versions.

### Replaced

| Was | Why |
| --- | --- |
| `google-generativeai` 0.8.3 | PyPI marks the package "Development Status :: 7 - Inactive" (0.8.6 is its last release). `google-genai` is the maintained SDK. |
| `googletrans` 4.0.0rc1 | An unofficial translation endpoint, and it pins `httpx` 0.13.3 and other old packages that cannot coexist with the current Google SDK. The model now writes in Nepali directly. |
| `tk` 0.1.0 | An unrelated PyPI package. Tkinter is part of Python's standard library. |
| the `pip freeze` in `requirements.txt` | It omitted `reportlab` (which the app imports) and pinned 42 packages by hand. `pyproject.toml` declares three dependencies and `uv.lock` pins the rest. |

## The Gemini model

| Where | Default | Checked |
| --- | --- | --- |
| Desktop app (`GEMINI_MODEL`), web page (`GEMINI_MODEL` in `script.js`) | `gemini-3.6-flash` | Google's models page lists it as **Stable**, and its deprecations page says no shutdown date is announced. The models page calls it "previous-generation", and a newer Flash model (`gemini-3.8-flash`) was listed as New; this was not adopted. |
| Before | `gemini-pro` (desktop), `gemini-1.5-flash` (web) | Neither id appears on Google's models page or its deprecations page, so they cannot be relied on. Whether the API still serves them was **not** established (a keyless probe could not tell). `gemini-2.0-flash` is listed as shut down. |

## Where it was run

| What | Result |
| --- | --- |
| pytest on Python 3.11, 3.12, 3.13, 3.14 | 166 passed on each |
| ruff, mypy (`src`) | clean |
| `node --test web` on Node 26.13.0 | 19 passed |
| The Tkinter window | **not run**: the Tk library (`libtk8.6.so`) is missing on the test machine |
| The Gemini call against the real API | **not run**: no API key was used; the service is tested against a fake client |
| CI | has not run |

## Things to watch

- `google-genai` 3.2.0 prints `SyntaxWarning`s at import under Python 3.14 (invalid `\/` escapes inside its own source). Harmless, but noisy; the mutation commands silence it with `-W ignore::SyntaxWarning`.
- The browser version calls Google directly from the page with the user's key. That is how the original worked; a small server-side proxy would keep keys off the client but adds hosting.
