"use client";

import { useEffect, useRef, useState } from "react";

import { ResultView } from "@/components/ResultView";
import {
  ApiError,
  exportFile,
  generate,
  getOptions,
  type ExportFormat,
  type GenerateForm,
  type Options,
  type Rendered,
} from "@/lib/api.ts";
import { addEntry, loadHistory, saveHistory, type HistoryEntry } from "@/lib/history.ts";

const FALLBACK_OPTIONS: Options = { output_types: ["Ideas", "Lesson Plan"], languages: ["English", "Nepali"], model: "" };

const EMPTY_FORM: GenerateForm = {
  topic: "",
  outcomes: "",
  age_group: "",
  output_type: "Ideas",
  time_minutes: "",
  location: "",
  language: "English",
};

const input =
  "w-full rounded-lg border border-line bg-field px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25";
const label = "mb-1 block text-sm font-medium";

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function message(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof DOMException && error.name === "AbortError") return "Stopped.";
  return "Could not reach the server. Check that the API is running and try again.";
}

export function Generator() {
  const [options, setOptions] = useState<Options>(FALLBACK_OPTIONS);
  const [apiKey, setApiKey] = useState("");
  const [form, setForm] = useState<GenerateForm>(EMPTY_FORM);
  const [streamed, setStreamed] = useState("");
  const [result, setResult] = useState<Rendered | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getOptions(controller.signal).then(setOptions, () => {});
    // localStorage exists only in the browser, so history is read after the first render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistory(loadHistory());
    return () => controller.abort();
  }, []);

  const set = (field: keyof GenerateForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const isPlan = form.output_type === "Lesson Plan";

  async function onSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setError("");
    setResult(null);
    setStreamed("");
    try {
      const rendered = await generate(form, apiKey, (text) => setStreamed((s) => s + text), controller.signal);
      setResult(rendered);
      const entry: HistoryEntry = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), form, result: rendered };
      const next = addEntry(history, entry);
      setHistory(next);
      if (!saveHistory(next)) setError("The answer is ready, but this browser would not save it to history.");
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }

  async function onExport(format: ExportFormat) {
    if (!result) return;
    setExporting(format);
    setError("");
    try {
      download(await exportFile(format, result.text), `${form.topic.trim() || "steam"}-${form.output_type}.${format}`.replace(/\s+/g, "-"));
    } catch (err) {
      setError(message(err));
    } finally {
      setExporting(null);
    }
  }

  function open(entry: HistoryEntry) {
    setForm(entry.form);
    setResult(entry.result);
    setStreamed("");
    setError("");
  }

  function clearHistory() {
    setHistory([]);
    saveHistory([]);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:grid-rows-[auto_1fr]">
        <form onSubmit={onSubmit} className="order-1 self-start lg:col-start-1 lg:row-start-1 space-y-4 rounded-2xl border border-line bg-panel p-5 shadow-sm">
          <div>
            <label className={label} htmlFor="key">
              Gemini API key
            </label>
            <input
              id="key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              className={input}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste your key"
              required
            />
            <p className="mt-1 text-xs text-muted">
              Kept in this tab only and sent with each request. Get one at{" "}
              <a className="underline" href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">
                Google AI Studio
              </a>
              .
            </p>
          </div>

          <div>
            <label className={label} htmlFor="topic">
              Topic
            </label>
            <input id="topic" className={input} value={form.topic} onChange={set("topic")} placeholder="Volcanoes" required />
          </div>

          <div>
            <label className={label} htmlFor="outcomes">
              Learning outcomes
            </label>
            <input
              id="outcomes"
              className={input}
              value={form.outcomes}
              onChange={set("outcomes")}
              placeholder="Explain eruptions, build a model"
              required
            />
            <p className="mt-1 text-xs text-muted">Separate them with commas.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="age">
                Age group
              </label>
              <input id="age" className={input} value={form.age_group} onChange={set("age_group")} placeholder="10-12" required />
            </div>
            <div>
              <label className={label} htmlFor="language">
                Language
              </label>
              <select id="language" className={input} value={form.language} onChange={set("language")}>
                {options.languages.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <fieldset>
            <legend className={label}>Output</legend>
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-field p-1">
              {options.output_types.map((t) => (
                <label
                  key={t}
                  className={`cursor-pointer rounded-md px-3 py-1.5 text-center text-sm transition ${
                    form.output_type === t ? "bg-panel font-medium shadow-sm" : "text-muted hover:text-fg"
                  }`}
                >
                  <input type="radio" name="output_type" value={t} checked={form.output_type === t} onChange={set("output_type")} className="sr-only" />
                  {t}
                </label>
              ))}
            </div>
          </fieldset>

          {isPlan && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label} htmlFor="time">
                  Class time (min)
                </label>
                <input id="time" type="number" min={1} className={input} value={form.time_minutes} onChange={set("time_minutes")} required />
              </div>
              <div>
                <label className={label} htmlFor="location">
                  Location
                </label>
                <input id="location" className={input} value={form.location} onChange={set("location")} placeholder="Classroom" />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent transition hover:brightness-110 disabled:opacity-60"
            >
              {busy ? "Generating…" : isPlan ? "Generate lesson plan" : "Generate ideas"}
            </button>
            {busy && (
              <button type="button" onClick={() => abort.current?.abort()} className="rounded-lg border border-line px-4 py-2.5 text-sm">
                Stop
              </button>
            )}
          </div>
          {options.model && <p className="text-center text-xs text-muted">Model: {options.model}</p>}
        </form>

        <section className="order-3 self-start rounded-2xl border border-line bg-panel p-5 shadow-sm lg:col-start-1 lg:row-start-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">History</h2>
            {history.length > 0 && (
              <button onClick={clearHistory} className="text-xs text-muted hover:text-fg">
                Clear
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-muted">Your generations appear here. They stay in this browser.</p>
          ) : (
            <ul className="space-y-1">
              {history.map((h) => (
                <li key={h.id}>
                  <button onClick={() => open(h)} className="w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-field">
                    <span className="font-medium">{h.form.topic}</span>
                    <span className="text-muted">
                      {" "}
                      · {h.form.output_type} · {new Date(h.createdAt).toLocaleDateString()}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

      <section className="order-2 min-h-[60vh] rounded-2xl border border-line bg-panel p-6 shadow-sm lg:col-start-2 lg:row-span-2 lg:row-start-1" aria-live="polite">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Result</h2>
          {result && (
            <div className="flex gap-2">
              {(["docx", "pdf"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => onExport(f)}
                  disabled={exporting !== null}
                  className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-field disabled:opacity-60"
                >
                  {exporting === f ? "Preparing…" : `Download ${f.toUpperCase()}`}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        {result ? (
          <ResultView lines={result.lines} />
        ) : streamed ? (
          <pre className="font-sans text-[0.95rem] leading-relaxed whitespace-pre-wrap">{streamed}</pre>
        ) : busy ? (
          <p className="animate-pulse text-sm text-muted">Waiting for the model…</p>
        ) : error ? null : (
          <div className="flex h-full min-h-[40vh] flex-col items-center justify-center text-center text-muted">
            <p className="text-base">Fill in the form to generate STEAM ideas or a 5E lesson plan.</p>
            <p className="mt-1 text-sm">Science · Technology · Engineering · Arts · Mathematics</p>
          </div>
        )}
      </section>
    </div>
  );
}
