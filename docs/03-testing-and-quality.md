# 3. Testing and quality

## Automated

| Command | Covers |
| --- | --- |
| `pnpm test` | `node:test` on the TypeScript sources (Node 26 strips the types). See below. |
| `pnpm lint` | ESLint with Next.js's rules. |
| `pnpm typecheck` | Route types, then `tsc --noEmit`. |
| `pnpm build` | The production build. |

What `pnpm test` covers:

- **Form validation and prompts.**
- **The provider list.**
- **The Markdown parser:**
  - it is checked against the reference regex on every string of up to 7 characters over `*`, space and `a`, plus 3,000 random ones;
  - a timing test runs it on hostile input.
- **Error messages,** including that the key never appears in one.
- **The streaming wrapper,** with a fake stream.
- **The key and model check** for every provider kind, with a fake `fetch`.
- **The request helpers.**
- **The SSE parser.**
- **The DOCX and PDF writers:**
  - the DOCX is unzipped, and the test checks that spaces between styled words are kept;
  - for the PDF, the test checks the fonts and the page breaks.

No test touches the network.

## Checked by hand (2026-11-14)

- **Wrong key, real providers:** with the built app running, `POST /api/verify` was sent a made-up key for all nine providers. Each one rejected it, and the app reported "did not accept the API key". This also shows each check endpoint exists: a wrong path would have returned 404, which reads as "no model".
- **Wrong key, generation:** `POST /api/generate` against Groq streamed the same rejection as an `error` event.
- **In a browser, with the two API responses mocked:**
  - the key check, then a streamed answer rendered with headings, bold, italic and bullets;
  - the DOCX and PDF downloads (the PDF was opened and matches the screen);
  - history surviving a reload, the model remembered, and the key cleared.

## CI

`.github/workflows/ci.yml` has two jobs:

- **check:** lint, typecheck, tests and build on Node 26.
- **docker:** builds the image, starts it, and checks the page loads and that `/api/verify` without a key returns 401.

## Not tested

- **A successful generation or key check against a real provider.** No real key was used.
- **A valid key with an unknown model.** The "no model called …" path was tested only with fakes.
- **The Docker image locally.** Docker on the development machine could not run build steps, so the CI `docker` job is the first build.
