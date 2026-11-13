# 1. Getting started

## Desktop app

Requirements: Python 3.11 or newer, [uv](https://docs.astral.sh/uv/), a Gemini API key, and Tk for Python.

| System | Tk |
| --- | --- |
| Debian, Ubuntu | `sudo apt install python3-tk` |
| Arch | `sudo pacman -S tk` |
| Windows, macOS (python.org installers) | included |

```sh
uv sync
export GEMINI_API_KEY=your-key        # optional: pre-fills the key dialog
uv run steam-generator
```

`uv run python steam.py` and `uv run python -m steam_generator` start the same program.

Fill in the topic, the learning outcomes (separated by commas) and the age group. Choose **Ideas** or **Lesson Plan**. A lesson plan also needs the class time in minutes; the location is optional (it defaults to a general classroom). Choose English or Nepali, then **Generate**. Use **Export Document** for DOCX or PDF. Menus: **API** changes the key, **History** shows the last five uses, **About** credits the original author.

## Browser version

Open `web/index.html` in a browser. Type your key into the page; it is kept in that tab's memory only. The page needs no server and no build step. It has Ideas and Lesson Plan modes, a dark mode, and a plain-text export.

## Settings

| Variable | Default | Effect |
| --- | --- | --- |
| `GEMINI_API_KEY` | none | Pre-fills the key dialog. `.env` files are not read. |
| `GEMINI_MODEL` | `gemini-3.6-flash` | The model the desktop app calls. |

If Google retires the default model, the app shows "The model '...' was not found. Set GEMINI_MODEL to a model your key can use." Set `GEMINI_MODEL` to a current one (the model list is at <https://ai.google.dev/gemini-api/docs/models>). The web page's model is the `GEMINI_MODEL` constant at the top of the API section of `web/script.js`.
