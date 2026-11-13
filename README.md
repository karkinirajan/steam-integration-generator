# STEAM Integration Generator

Generates creative **STEAM** (Science, Technology, Engineering, Arts, Mathematics) integration ideas, or a full **5E lesson plan**, for a topic, learning outcomes and an age group, using the Google Gemini API. It comes in two forms: a desktop app (Python, Tkinter) and a single static web page.

This is a fork of [rajat-ed/steam-integration-generator](https://github.com/rajat-ed/steam-integration-generator) (MIT). The original author is still credited in the app's About box.

## Features

- **Ideas or a lesson plan:** STEAM integration ideas, or a 5E lesson plan (Engage, Explore, Explain, Elaborate, Evaluate) for a class time and a location.
- **English or Nepali output:** the model writes in the chosen language directly.
- **Formatted output:** headings, bold, italic and bullets, on screen and in the exported files.
- **Export to DOCX or PDF** (PDF cannot show Nepali letters; use DOCX for those, and the app says so).
- **Usage history:** the last five uses, in memory.
- **Browser version:** `web/index.html` does the same in a browser, with a dark mode and a plain-text export.

## Quick start

You need [uv](https://docs.astral.sh/uv/) and a [Gemini API key](https://aistudio.google.com/app/apikey). `uv sync` downloads Python 3.14 for you; that build includes Tk, so nothing else needs installing.

```sh
git clone git@github.com:karkinirajan/steam-integration-generator.git
cd steam-integration-generator
uv sync
uv run steam-generator          # or: uv run python steam.py
```

The app asks for your API key when it starts. To skip typing it, set `GEMINI_API_KEY` first. The key is held in memory only and never written to disk.

For the browser version, open `web/index.html` in a browser and type your key into the page. It stays in that tab's memory.

## Configuration

| Variable | Default | What it does |
| --- | --- | --- |
| `GEMINI_API_KEY` | none | Fills in the key dialog. The app does not read `.env` files; export the variable in your shell. |
| `GEMINI_MODEL` | `gemini-3.6-flash` | The model to call (desktop app). The web page has the same default in `web/script.js`. |

## Project structure

```text
src/steam_generator/    The desktop app
  app.py                  The Tkinter window (the only module that needs a display)
  prompts.py              The two prompt templates
  request.py              Checks what was typed and builds a request
  gemini.py               The Gemini call, with friendly errors
  markup.py               Parses the model's Markdown into styled lines (one parser for screen, DOCX and PDF)
  exports.py              DOCX and PDF writers
  history.py, config.py   The last five uses; the model and key settings
steam.py                Compatibility entry point (python steam.py)
web/                    The browser version: index.html, script.js, format.js, style.css
tests/                  pytest suite and the mutation checks (tests/mutation)
docs/                   The guide, a work log, and sample exports from the old version
```

## Documentation

The guide in [docs/](docs/README.md) has four short chapters: getting started, architecture, testing and quality, and the record of the last modernisation pass ([docs/work-done.md](docs/work-done.md)). [VERSIONS.md](VERSIONS.md) lists the versions used and how they were checked.

## Testing

```sh
uv run ruff check . && uv run mypy src && uv run pytest -q    # Python
node --test web                                                # the web page's formatting code
```

The tests do not touch the network. The Tkinter window has no automated test (see [docs/03-testing-and-quality.md](docs/03-testing-and-quality.md)).

## Known limits

- PDF export cannot draw Devanagari (Nepali). Use DOCX for Nepali output.
- The browser version sends your key from the page to Google. Use a key you can revoke.
- The window itself (`app.py`) was written against the previous code's layout and checked for types and lint, but not run in this pass.

## License

MIT. See [LICENSE](LICENSE).
