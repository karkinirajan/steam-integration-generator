# Versions

What the project runs on and how each version was chosen (2026-11-14).

## Runtimes and tooling

| Component | Version | Where | Notes |
| --- | --- | --- | --- |
| Node.js | 26 | `.nvmrc`, CI, `node:26-slim` image | Run locally on 26.13.0. Tests run the TypeScript sources directly (Node strips the types). |
| pnpm | 12.20.0 | `packageManager` in `package.json`, CI, image | Node 26 no longer bundles corepack, so CI and the image install pnpm with npm. |
| GitHub Actions | `checkout@v7`, `setup-node@v7` | `.github/workflows/ci.yml` | |

## Dependencies (`pnpm-lock.yaml`)

Runtime dependencies are pinned exactly. Except where noted, each was the newest release that was at least about two weeks old when installed, to leave time for a bad release to be noticed and pulled.

| Package | Version | Role |
| --- | --- | --- |
| `next` | 16.4.6 | The framework (scaffolded with `create-next-app@16.4.6`) |
| `react`, `react-dom` | 19.3.0 | UI |
| `ai` | 7.0.159 | Vercel AI SDK: one streaming interface for every provider (released 2026-10-30) |
| `@ai-sdk/openai` | 4.0.106 | OpenAI, and every OpenAI-compatible vendor |
| `@ai-sdk/anthropic` | 4.0.94 | Anthropic |
| `@ai-sdk/google` | 4.0.109 | Google Gemini |
| `docx` | 9.15.1 | DOCX export, in the browser (9.15.4 was published the same morning and was skipped) |
| `jspdf` | 4.2.1 | PDF export, in the browser (latest; released 2026-03-17) |
| `tailwindcss` | 4.3.3 | Styles (dev) |
| `typescript` | 5.9.3 | Types (dev) |
| `eslint` | 9.39.5 | Lint, with `eslint-config-next` 16.4.6 (dev). pnpm notes 9.x is deprecated in favour of 10.x; `eslint-config-next` 16.4.6 was scaffolded with 9. |
| `fflate` | 0.8.3 | Unzips the DOCX in a test (dev); already in the tree as a dependency of `docx` |

All four AI SDK packages resolve to one `@ai-sdk/provider-utils` (5.0.72) and one `zod` (4.6.7).

Install scripts are not run. `pnpm-workspace.yaml` lists the packages that ask to run them (`sharp`, `unrs-resolver`, `core-js`) as denied.

## Things to watch

- **eslint 10:** move to it once `eslint-config-next` supports it.
- **OpenRouter key check:** it relies on `GET /api/v1/key`. That endpoint rejected a made-up key with 401 on 2026-11-14, which matches what the check expects, but a real key has not been tried.
