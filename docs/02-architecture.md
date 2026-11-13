# 2. Architecture

## Layers

Everything that can run without a display is in plain modules with no Tkinter import, so it is testable. Only `app.py` touches Tk.

| Module | Job |
| --- | --- |
| `request.py` | Checks the form (`validate`) and returns an immutable `Request`, or raises `InputError` with a message for the person. |
| `prompts.py` | `build_prompt(...)`: the two templates. The text is the original application's. |
| `gemini.py` | `GeminiService.generate(prompt)`; turns every failure into a `GenerationError` whose message is safe to show. |
| `markup.py` | Parses the model's light Markdown into `Line`s of `Run`s (bold, italic) with headings and bullets. |
| `exports.py` | `write_docx` and `write_pdf`, both driven by the same parse. `pdf_can_render` says whether the PDF's fonts can draw the text. |
| `history.py`, `config.py` | The last five uses; the model name and the shape of an API key. |
| `app.py` | The window. |

## A request

1. `validate` turns the form into a `Request` (a lesson plan needs a class time; ideas do not).
2. `build_prompt` builds the text. For a language other than English it appends an instruction to write the whole answer in that language and to keep the same `**bold**` and `*italic*` markers.
3. A worker thread calls `GeminiService.generate`. The thread makes no Tk calls: it puts its result on a queue, and the window polls the queue every 100 ms from the main thread.
4. The response is kept **as returned** (`SteamApp.markdown`) and shown through `markup.parse`. Exports use the stored response, not the displayed text, so the formatting survives.

## Errors and the key

`gemini.describe_api_error` maps the status code to a message a teacher can act on: a rejected key, a missing model (names it and `GEMINI_MODEL`), a rate limit, a service problem. Network failures report only the kind of exception. The key is never put in a message, and the original exception is not chained, so a traceback cannot carry request details. The key shape check (`config.looks_like_api_key`) only catches typos; Google decides whether a key is valid.

## Nepali

The old version translated the English answer with `googletrans`, an unofficial endpoint whose pinned dependencies conflict with the current Google SDK. The model now writes in the chosen language directly. PDF export cannot draw Devanagari with its built-in fonts, so the window offers DOCX instead.

## The web page

`web/index.html` with `script.js` (the page), `format.js` (pure helpers) and `style.css`. The key travels in an `x-goog-api-key` header (Google's endpoint allows it from browser origins), not in the URL. `format.js` escapes the model's text before formatting it, so nothing the model writes becomes markup. `format.js` also loads under Node, which is how it is tested.
