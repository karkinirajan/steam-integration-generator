# STEAM Integration Generator

Generates creative **STEAM** (Science, Technology, Engineering, Arts, Mathematics) integration ideas, or a full **5E lesson plan**, for a topic, learning outcomes and an age group, using the Google Gemini API. A web app: a FastAPI backend and a Next.js frontend.

This is a fork of [rajat-ed/steam-integration-generator](https://github.com/rajat-ed/steam-integration-generator) (MIT). The original author is credited in the page footer.

## Features

- **Ideas or a lesson plan:** STEAM integration ideas, or a 5E lesson plan (Engage, Explore, Explain, Elaborate, Evaluate) for a class time and a location.
- **Streaming:** the answer appears as the model writes it.
- **English or Nepali output:** the model writes in the chosen language directly.
- **Export to DOCX or PDF:** with headings, bold, italic and bullets. PDF cannot show Nepali letters; use DOCX for those, and the page says so.
- **History:** past answers are kept in your browser (localStorage), never on the server.
- **Bring your own key:** you paste your Gemini API key into the page. It stays in that tab's memory and goes to this app's API with each request, which uses it for that call only and never stores or logs it.

## Quick start

You need [uv](https://docs.astral.sh/uv/), Node.js 26 with [pnpm](https://pnpm.io/), and a [Gemini API key](https://aistudio.google.com/app/apikey).

```sh
git clone git@github.com:karkinirajan/steam-integration-generator.git
cd steam-integration-generator

# terminal 1: the API on http://localhost:8000 (docs at /docs)
cd backend && uv sync && uv run fastapi dev app/main.py

# terminal 2: the web app on http://localhost:3000
cd frontend && pnpm install && pnpm dev
```

Or with Docker: `docker compose up --build`, then open http://localhost:3000.

## Configuration

| Variable | Where | Default | What it does |
| --- | --- | --- | --- |
| `GEMINI_MODEL` | backend | `gemini-3.6-flash` | The model to call. |
| `ALLOWED_ORIGINS` | backend | `http://localhost:3000` | Comma-separated browser origins allowed by CORS (only needed if the browser calls the API directly). |
| `API_URL` | frontend | `http://localhost:8000` | Where Next.js forwards `/api`. Fixed at `next build` time; the Docker image takes it as a build argument. |

There is no server-side Gemini key: every request uses the caller's own key.

## Project structure

```text
backend/                FastAPI service (uv, Python 3.14)
  app/main.py             App factory and CORS
  app/api/                HTTP layer: routes, request/response schemas, the key header
  app/core/               Domain logic, no HTTP: prompts, form validation, the Gemini call, the Markdown parser, DOCX/PDF writers
  tests/                  pytest suite, and the mutation checks (tests/mutation)
frontend/               Next.js 16 app (TypeScript, Tailwind v4)
  src/app/                Layout and page
  src/components/         Generator (form, streaming, export, history) and ResultView
  src/lib/                API client, SSE parser, history storage
docs/                   The guide, plans, the work log, and sample exports from the old version
docker-compose.yml      api + web
```

## Documentation

The guide in [docs/](docs/README.md) has three chapters: getting started, architecture, and testing and quality. [VERSIONS.md](VERSIONS.md) lists the versions used and how they were checked.

## Testing

```sh
cd backend && uv run ruff check . && uv run mypy app && uv run pytest -q
cd frontend && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

The tests do not touch the network.

## Known limits

- PDF export cannot draw Devanagari (Nepali). Use DOCX for Nepali output.
- No rate limiting is built in. Each generation spends the caller's own quota, but `/api/export` needs no key; put the app behind a proxy that limits requests per IP before exposing it publicly.

## License

MIT. See [LICENSE](LICENSE).
