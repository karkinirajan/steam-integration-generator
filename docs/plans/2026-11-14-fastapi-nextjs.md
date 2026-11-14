# Plan: FastAPI + Next.js web app

Replaces the Tkinter app (`src/steam_generator/app.py`, `steam.py`) and the static page (`web/`) with one web app.

## Decisions

- **API key:** the user pastes their own Gemini key into the page. The browser keeps it in tab memory and sends it in the
  `X-Gemini-Key` header on each request. The backend uses it for that call only; it is never logged or stored.
- **Scope:** no login and no database. History lives in the browser's `localStorage`.
- **Old UIs:** both removed.

## Steps

1. **Backend skeleton:** `backend/` uv project, with the core modules moved into `backend/app/core/` unchanged
   (`config`, `prompts`, `request`, `gemini`, `markup`, `exports`) and their tests moved with them.
2. **Streaming:** `GeminiService.stream()` yields text chunks, mapping errors the same way `generate()` does.
3. **API:**
   - `GET /api/health`
   - `GET /api/options`: the output types, the languages, and the model.
   - `POST /api/generate`: Server-Sent Events with `chunk`, `error` and `done` events.
   - `POST /api/export/{docx|pdf}`: returns the file.
   - Validation reuses `request.validate`, so `InputError` becomes a 422 response with the user-facing message.
4. **Nepali PDF:** register Noto Sans Devanagari when the font file is present; otherwise keep the cp1252 check.
5. **Frontend:** Next.js 16, TypeScript and Tailwind v4 in `frontend/`.
   - Form, a streamed result, DOCX and PDF export, history, and dark mode.
   - The result renders from the same line model as the exports (the backend returns the parsed lines on `done`).
6. **Cleanup:** remove `src/`, `steam.py`, `web/` and the root `pyproject.toml`/`uv.lock`; update the mutation checks.
7. **Ops:** a Dockerfile for each app, `docker-compose.yml`, and CI jobs for both stacks.
8. **Docs:** update the README and the docs chapters.
