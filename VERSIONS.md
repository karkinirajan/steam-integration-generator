# Versions

What the project runs on and how each version was checked (2026-11-12; the web app stack was added 2026-11-14). Where something could not be verified, it says so.

## Runtimes and tooling

| Component | Version | Where | Notes |
| --- | --- | --- | --- |
| Python | 3.14 only | `backend/.python-version`, `requires-python >=3.14`, ruff `py314`, mypy `3.14`, CI, `python:3.14-slim` image | uv's managed build locally (`python-preference = "only-managed"`). Older versions were dropped on 2026-11-13. |
| Node.js | 26 | `.nvmrc`, CI, `node:26-slim` image | The Next.js frontend. Run locally on 26.13.0. Node 26 no longer bundles corepack, so CI and the image install pnpm with npm. |
| pnpm | 12.20.0 | `frontend/package.json` `packageManager`, CI, image | |
| uv | 0.13.8 | the lock was last updated with it; the backend image copies this version | |
| GitHub Actions | `checkout@v7`, `setup-node@v7`, `setup-uv@v10.3.3` | `.github/workflows/ci.yml` | The latest majors on 2026-11-12. setup-uv has no floating `v10` tag, so it is pinned to the full version. |

## Backend dependencies (`backend/uv.lock`, 86 packages)

| Package | Locked | Role |
| --- | --- | --- |
| `google-genai` | 3.2.0 | The Gemini SDK |
| `python-docx` | 1.2.0 | DOCX export |
| `reportlab` | 5.1.0 | PDF export |
| `fastapi[standard]` | 0.162.7 | The HTTP API (with Starlette 1.10.0, pydantic 2.14.3, uvicorn 0.54.0) |
| `httpx` | 0.28.1 | `TestClient` (dev) |
| `pytest` | 9.2.0 | tests (dev) |
| `ruff` | 0.17.4 | lint (dev) |
| `mypy` | 2.4.1 | types (dev) |

Declared floors equal these tested versions.

## Frontend dependencies (`frontend/pnpm-lock.yaml`)

| Package | Locked | Role |
| --- | --- | --- |
| `next` | 16.4.6 | The framework (scaffolded with `create-next-app@16.4.6`) |
| `react`, `react-dom` | 19.3.0 | UI |
| `tailwindcss` | 4.3.3 | Styles |
| `typescript` | 5.9.3 | Types |
| `eslint` | 9.39.5 | Lint, with `eslint-config-next` 16.4.6 |

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
| Backend (`GEMINI_MODEL`) | `gemini-3.6-flash` | Google's models page lists it as **Stable**, and its deprecations page says no shutdown date is announced. The models page calls it "previous-generation", and a newer Flash model (`gemini-3.8-flash`) was listed as New; this was not adopted. |
| Before | `gemini-pro` (desktop), `gemini-1.5-flash` (web) | Neither id appears on Google's models page or its deprecations page, so they cannot be relied on. Whether the API still serves them was **not** established (a keyless probe could not tell). `gemini-2.0-flash` is listed as shut down. |

## Where it was run

| What | Result |
| --- | --- |
| Backend pytest on Python 3.14.10 (2026-11-14) | 198 passed |
| Backend ruff, mypy (`app`) | clean |
| Backend mutation check | 80/80 killed |
| Frontend lint, typecheck, `pnpm test` (6), `next build` on Node 26.13.0 | all pass |
| Both servers together, through the Next.js `/api` proxy | health, options and PDF export OK; generate streamed the real Gemini API's rejection of a fake key as an `error` event |
| The page in a browser | checked at 1280 and 390 px wide: the empty state and the error path; no console errors |
| A successful generation against the real API | **not run**: no real key was used |
| Docker images | **not built locally** (see below); the CI `docker` job builds and smoke-tests them |
| CI | the new workflow has not run on GitHub yet |

## Things to watch

- `google-genai` 3.2.0 (and 3.3.0) has invalid `\/` escapes in its own `types.py`, so Python 3.14 prints two `SyntaxWarning`s the first time it compiles that file. `backend/app/core/gemini.py` ignores that one message around its import, and `pyproject.toml` does the same for pytest. Remove both once google-genai fixes it.
- The user's key now passes through this app's backend instead of going from the page to Google. It is still the user's key, entered in the page.
- Local Docker on the development machine (rootless, overlay) could not run any `RUN` step, not even `RUN true`, so the images have not been built locally. The CI `docker` job builds and smoke-tests them.
