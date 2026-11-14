# 2. Architecture

## Layers

```text
browser ──► Next.js (frontend/)  ──/api rewrite──►  FastAPI (backend/app/api)  ──►  app/core  ──►  Gemini API
             form, streaming view,                   HTTP only: schemas,              prompts, validation,
             history (localStorage)                  key header, SSE, files           Gemini service, parser, exports
```

- **`backend/app/core/`** has no HTTP code. It is the code the old desktop app was built on, moved here unchanged except for streaming and in-memory export:
  - `request.py` checks the form and raises `InputError` with a message written for a teacher.
  - `prompts.py` holds the original two prompt templates, plus a language instruction.
  - `gemini.py` calls the model (`generate` and `stream`) and turns every failure into a `GenerationError` whose text never contains the key.
  - `markup.py` parses the model's light Markdown into lines of styled runs.
  - `exports.py` writes those lines to DOCX and PDF.
- **`backend/app/api/`** is a thin wrapper over `app/core`. No prompt, validation or formatting logic lives there.
- **`frontend/`** is one page. `Generator` owns the form and its state, `lib/api.ts` is the API client, `lib/sse.ts` parses the event stream, and `ResultView` draws the parsed lines.

## Endpoints

| Method and path | Body | Answer |
| --- | --- | --- |
| `GET /api/health` | | `{"status": "ok"}` |
| `GET /api/options` | | The output types, the languages, and the model |
| `POST /api/generate` | Form fields, plus the `X-Gemini-Key` header | `text/event-stream`: `chunk` events with text, then `done` with `{text, lines}`, or `error` with a message |
| `POST /api/export/docx` and `/api/export/pdf` | `{"text": ...}` | The file |

Status codes:

- **401:** the key is missing or mistyped.
- **422:** the form is invalid. `detail` holds the message from `request.py`, or pydantic's list for oversized fields.
- **422 (PDF export):** the text contains letters the PDF fonts cannot draw.

Errors from Gemini come back inside the stream as `error` events, since the 200 status has already been sent by then.

## One parser for screen and files

While the answer streams, the page shows the raw text. When the `done` event arrives, it carries `lines`, the output of `markup.parse`, and the page draws those. Those are the same lines `exports.py` writes to DOCX and PDF, so what you see is what you download. The old static page had a separate JavaScript parser that could disagree with the Python one; it is gone.

`parse_inline` runs in linear time. It used to be a regex with a lazy `.+?`, which took quadratic time on lines full of unclosed `*`. Because `/api/export` needs no key, that was a way to make the server do minutes of work per request. The regex is kept as a reference, and a test checks that the scanner agrees with it.

## The API key

The key lives in React state, sent in a header to the page's own origin, and is forwarded once to Google. The backend never logs or stores it, and `GenerationError` messages are built so they cannot contain it (`tests/test_gemini.py` and `tests/test_api.py` check this). History entries hold the form and the answer, never the key.

## Limits

- Text fields are capped at 500 characters and the outcomes at 2,000.
- Export text is capped at 50,000 characters, which is about a second of PDF work. A long lesson plan is around 15,000.
- There is no rate limiting in the app. Add it at the reverse proxy before exposing the service publicly.
