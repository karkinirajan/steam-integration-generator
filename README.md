# STEAM Integration Generator

Generates creative **STEAM** (Science, Technology, Engineering, Arts, Mathematics) integration ideas, or a full **5E lesson plan**, for a topic, learning outcomes and an age group. One Next.js app; you choose the AI provider and model, and bring your own key.

This is a fork of [rajat-ed/steam-integration-generator](https://github.com/rajat-ed/steam-integration-generator) (MIT). The original author is credited in the page footer.

## Features

- **Ideas or a lesson plan:** STEAM integration ideas, or a 5E lesson plan (Engage, Explore, Explain, Elaborate, Evaluate) for a class time and a location. The prompts are the original app's.
- **Any provider, any model:** OpenAI, Anthropic, Google Gemini, OpenRouter, Groq, Mistral, DeepSeek, xAI or Together AI. You type the exact model id.
- **Key and model checked first:** before anything is generated, the server asks the provider whether the key works and the model exists. This spends no tokens, and the error says which of the two is wrong.
- **Streaming:** the answer appears, already formatted, as the model writes it.
- **English or Nepali:** the model writes in the chosen language directly.
- **DOCX and PDF:** built in your browser from the same parsed lines you see on screen, so the files match the preview. PDF cannot show Nepali letters; DOCX can, and the page says so.
- **History:** past answers stay in your browser (localStorage). The provider and model are remembered; the key never is.

## Quick start

You need Node.js 26 (see `.nvmrc`), pnpm 12, and an API key from one of the providers.

```sh
git clone git@github.com:karkinirajan/steam-integration-generator.git
cd steam-integration-generator
pnpm install
pnpm dev          # http://localhost:3000
```

Production: `pnpm build && pnpm start`, or `docker build -t steam-generator . && docker run -p 3000:3000 steam-generator`.

There is nothing to configure: no server-side keys and no environment variables.

## Project structure

```text
src/app/                  The page, and the two route handlers
  api/verify/route.ts       POST: check a key and a model with the provider
  api/generate/route.ts     POST: stream the answer as Server-Sent Events
src/components/           Generator (state), CredentialsPanel, LessonForm, ResultPanel, ResultView, HistoryPanel
src/lib/core/             Shared by page and server: providers, form validation, prompts, the Markdown parser
src/lib/server/           Server only: the model call (Vercel AI SDK), the key/model check, error messages, request helpers
src/lib/                  Browser: API client, SSE parser, DOCX/PDF export, history
docs/                     The guide
```

## Documentation

The guide in [docs/](docs/README.md) has three chapters: getting started, architecture, and testing and quality. [VERSIONS.md](VERSIONS.md) lists the versions used and how they were checked.

## Checks

```sh
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

The tests do not touch the network.

## Known limits

- PDF cannot draw Devanagari (Nepali). Use DOCX for Nepali output.
- No rate limiting is built in. Every model call spends the caller's own key, but put the app behind a proxy that limits requests per IP before exposing it publicly.

## License

MIT. See [LICENSE](LICENSE).
