# 2. Architecture

## Layers

```text
browser                                   Next.js server                         provider
───────                                   ──────────────                         ────────
Generator (state)                         app/api/verify    ── lib/server/verify ──►  model lookup (no tokens)
  CredentialsPanel, LessonForm  ──fetch──►app/api/generate  ── lib/server/llm    ──►  streamed completion
  ResultPanel ◄── SSE ─────────────────── (chunk… done | error)
  lib/exports (DOCX, PDF)
                 └──────────── lib/core: providers, request validation, prompts, markup ────────────┘
```

- **`src/lib/core/`** is plain TypeScript used on both sides.
  - `providers.ts` is the fixed provider list.
  - `request.ts` checks the form and raises `InputError` with a message written for a teacher.
  - `prompts.ts` holds the original two templates.
  - `markup.ts` is the Markdown parser.
- **`src/lib/server/`** holds the code that touches keys and providers.
  - `llm.ts` builds the AI SDK model for any provider and streams the answer.
  - `verify.ts` checks a key and a model without generating anything.
  - `errors.ts` turns every failure into a message that names the cause and never contains the key.
  - `http.ts` reads and checks the request.
- **`src/app/api/*/route.ts`** are thin. No prompt, validation or formatting logic lives there.
- **Components:** `Generator` owns the state, in memory only; the panels only render. There is no database and no browser storage.

## Endpoints

Both take JSON with `provider` and `model`, and the key in the `X-Api-Key` header.

| Endpoint | Body | Answer |
| --- | --- | --- |
| `POST /api/verify` | `{provider, model}` | `200 {ok: true}`, or an error with `detail` |
| `POST /api/generate` | `{provider, model, form}` | `text/event-stream`: `chunk` events with text, then `done`, or one `error` |

Status codes:

- **401:** the key is missing or not key-shaped.
- **413:** the request body is too large.
- **422:** the provider is unknown, the model id is malformed, the form is invalid, or the provider rejected the key or the model. `detail` says which.

Provider failures during generation arrive inside the stream as `error` events, because the 200 status has already been sent by then.

## Providers

`PROVIDERS` in `providers.ts` is a fixed list, and the server only ever contacts those hosts. The caller picks one by id, so a request cannot make the server fetch an arbitrary URL. OpenRouter alone reaches hundreds of models from most vendors.

Generation goes through the [Vercel AI SDK](https://ai-sdk.dev):

- **OpenAI, Anthropic, Gemini:** their own SDK providers.
- **Every other vendor:** the OpenAI provider pointed at that vendor's base URL, using the Chat Completions API.

## Checking the key and the model

`verifyCredentials` spends no tokens:

| Provider | How |
| --- | --- |
| OpenAI, Anthropic, Gemini | Fetch that one model with the key. 401/403 means the key; 404 means the model. Anthropic and Gemini resolve aliases this way. |
| Groq, Mistral, DeepSeek, xAI, Together | List the models with the key (a bad key fails here), then look for the model in the list. |
| OpenRouter | Its model list is public, so the key is first checked on `GET /api/v1/key`, then the model is looked up in the list. |

The Gemini key goes in the `x-goog-api-key` header, never in a URL.

## One parser for screen and files

The page parses the streamed text with `markup.parse` as it arrives and draws the lines. The DOCX and PDF are built in the browser from the same lines, so the downloads match the preview.

`parseInline` runs in linear time. The obvious regex version, kept in the tests as the reference, re-scans the rest of the line from every unclosed `*`, which is quadratic.

## Limits

- Text fields are capped at 500 characters, the outcomes at 2,000, and the request body at 16 KB.
- Each provider call has one retry. The key check times out after 10 seconds.
- There is no rate limiting in the app. Add it at the reverse proxy before exposing the app publicly.
