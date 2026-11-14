"use client";

import { useEffect, useRef, useState } from "react";

import { ApiError, generate, verify, type Credentials } from "@/lib/api.ts";
import { PROVIDERS } from "@/lib/core/providers.ts";
import type { FormInput } from "@/lib/core/request.ts";
import { addEntry, loadHistory, saveHistory, type HistoryEntry } from "@/lib/history.ts";

import { CredentialsPanel, type VerifyState } from "./CredentialsPanel";
import { HistoryPanel } from "./HistoryPanel";
import { LessonForm } from "./LessonForm";
import { ResultPanel } from "./ResultPanel";

const EMPTY_FORM: FormInput = {
  topic: "",
  outcomes: "",
  age_group: "",
  output_type: "Ideas",
  time_minutes: "",
  location: "",
  language: "English",
};

// The provider and model are remembered for convenience; the key never is.
const MODEL_PREFS_KEY = "steam-model-v1";

function loadModelPrefs(): { provider: string; model: string } | null {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(MODEL_PREFS_KEY) ?? "null");
    const prefs = value as { provider?: unknown; model?: unknown } | null;
    return typeof prefs?.provider === "string" && typeof prefs?.model === "string" ? { provider: prefs.provider, model: prefs.model } : null;
  } catch {
    return null;
  }
}

function saveModelPrefs(provider: string, model: string) {
  try {
    window.localStorage.setItem(MODEL_PREFS_KEY, JSON.stringify({ provider, model }));
  } catch {
    // storage blocked: nothing to remember
  }
}

function message(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof DOMException && error.name === "AbortError") return "Stopped.";
  return "Could not reach the server. Check your connection and try again.";
}

export function Generator() {
  const [creds, setCreds] = useState<Credentials>({ provider: PROVIDERS[0].id, model: "", apiKey: "" });
  const [check, setCheck] = useState<VerifyState>({ status: "idle" });
  const [form, setForm] = useState<FormInput>(EMPTY_FORM);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    // localStorage exists only in the browser, so saved state is read after the first render.
    const prefs = loadModelPrefs();
    /* eslint-disable react-hooks/set-state-in-effect */
    if (prefs) setCreds((c) => ({ ...c, ...prefs }));
    setHistory(loadHistory());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  function changeCreds(change: Partial<Credentials>) {
    setCreds((c) => ({ ...c, ...change }));
    setCheck({ status: "idle" }); // any change means the pair has to be checked again
  }

  async function onVerify() {
    setCheck({ status: "checking" });
    try {
      await verify(creds);
      setCheck({ status: "valid" });
      saveModelPrefs(creds.provider, creds.model.trim());
    } catch (err) {
      setCheck({ status: "invalid", message: message(err) });
    }
  }

  async function onGenerate() {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setError("");
    setText("");
    try {
      const full = await generate(creds, form, (piece) => setText((t) => t + piece), controller.signal);
      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        provider: creds.provider,
        model: creds.model.trim(),
        form,
        text: full,
      };
      const next = addEntry(history, entry);
      setHistory(next);
      if (!saveHistory(next)) setError("The answer is ready, but this browser would not save it to history.");
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }

  function openEntry(entry: HistoryEntry) {
    setForm(entry.form);
    setText(entry.text);
    setError("");
  }

  const fileName = `${form.topic.trim() || "steam"}-${form.output_type}`.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <div className="space-y-6">
        <CredentialsPanel {...creds} verify={check} onChange={changeCreds} onVerify={onVerify} />
        <LessonForm
          form={form}
          onChange={(change) => setForm((f) => ({ ...f, ...change }))}
          onSubmit={onGenerate}
          onStop={() => abort.current?.abort()}
          busy={busy}
          ready={check.status === "valid"}
        />
        <div className="hidden lg:block">
          <HistoryPanel entries={history} onOpen={openEntry} onClear={() => (setHistory([]), saveHistory([]))} />
        </div>
      </div>
      <div className="space-y-6">
        <ResultPanel text={text} busy={busy} error={error} fileName={fileName} />
        <div className="lg:hidden">
          <HistoryPanel entries={history} onOpen={openEntry} onClear={() => (setHistory([]), saveHistory([]))} />
        </div>
      </div>
    </div>
  );
}
