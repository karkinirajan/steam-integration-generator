# 1. Getting started

## Requirements

- Node.js 26 (see `.nvmrc`) and pnpm 12.
- An API key from one of the supported providers: OpenAI, Anthropic, Google Gemini, OpenRouter, Groq, Mistral, DeepSeek, xAI or Together AI.

## Run

```sh
pnpm install
pnpm dev                              # development, http://localhost:3000
pnpm build && pnpm start              # production
docker build -t steam-generator .     # or as a container
docker run -p 3000:3000 steam-generator
```

Nothing needs configuring. The server holds no keys of its own.

## Use

1. **Model.** Choose a provider and type the exact model id (the placeholder shows an example). Paste your API key, then press **Check key and model**.
   - The badge turns **Ready** when the provider accepts the key and knows the model.
   - Otherwise the message says which one is wrong.
   - Changing any of the three fields means checking again.
2. **Lesson.** Fill in the topic, the learning outcomes (comma-separated) and the age group, and choose a language. Choose **Ideas** or **Lesson Plan**; a lesson plan also asks for the class time in minutes and an optional location.
3. **Generate.** The answer streams in already formatted. **Stop** cancels it.
4. **Download** a DOCX or a PDF, or **Copy** the text. For Nepali, use DOCX.

Nothing is saved anywhere. Reloading or closing the tab clears the key, the form and the answer, so download or copy what you want to keep.

## The key

The key lives only in the open tab. It is sent to this app's own server in a header with each check or generation, passed to the provider for that one call, and never logged or stored.
