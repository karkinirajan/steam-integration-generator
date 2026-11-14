# 1. Getting started

## Requirements

- [uv](https://docs.astral.sh/uv/). `uv sync` downloads Python 3.14 for you.
- Node.js 26 (see `.nvmrc`) and pnpm 12.
- A [Gemini API key](https://aistudio.google.com/app/apikey). Each person using the page brings their own.

## Run for development

```sh
cd backend
uv sync
uv run fastapi dev app/main.py        # http://localhost:8000, interactive API docs at /docs
```

```sh
cd frontend
pnpm install
pnpm dev                              # http://localhost:3000
```

The page calls `/api/...` on its own origin, and Next.js forwards those calls to `API_URL` (default `http://localhost:8000`). The browser never talks to FastAPI directly, so there is no CORS setup in development.

## Run with Docker

```sh
docker compose up --build             # http://localhost:3000
```

Only the web container publishes a port. It forwards `/api` to the `api` container on the compose network.

## Configuration

| Variable | Where | Default | What it does |
| --- | --- | --- | --- |
| `GEMINI_MODEL` | backend | `gemini-3.6-flash` | The model to call. `GET /api/options` reports it and the page shows it under the button. |
| `ALLOWED_ORIGINS` | backend | `http://localhost:3000` | Comma-separated origins for CORS, only needed if a browser calls the API from another origin. |
| `API_URL` | frontend | `http://localhost:8000` | Where `/api` is forwarded. `next build` fixes it, so set it at build time (the compose file passes `http://api:8000`). |

## Using it

1. Paste your Gemini API key. It stays in that tab's memory only; reloading the page clears it.
2. Fill in the topic, the learning outcomes (comma-separated) and the age group. Choose **Ideas** or **Lesson Plan**. A lesson plan also asks for the class time in minutes and an optional location.
3. Press **Generate**. The answer streams in; **Stop** cancels it.
4. Download it as DOCX or PDF. For Nepali, use DOCX.
5. Past answers appear under **History**, in this browser only. **Clear** removes them.
