"use client";

import { useRef, useState } from "react";

import { ApiError, generate, verify, type Credentials } from "@/lib/api.ts";
import { PROVIDERS } from "@/lib/core/providers.ts";
import type { FormInput } from "@/lib/core/request.ts";

import { CredentialsPanel, type VerifyState } from "./CredentialsPanel";
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

function message(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof DOMException && error.name === "AbortError") return "Stopped.";
  return "Could not reach the server. Check your connection and try again.";
}

/** All state lives here, in memory only: nothing is stored in the browser or on the server. */
export function Generator() {
  const [creds, setCreds] = useState<Credentials>({ provider: PROVIDERS[0].id, model: "", apiKey: "" });
  const [check, setCheck] = useState<VerifyState>({ status: "idle" });
  const [form, setForm] = useState<FormInput>(EMPTY_FORM);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);

  function changeCreds(change: Partial<Credentials>) {
    setCreds((c) => ({ ...c, ...change }));
    setCheck({ status: "idle" }); // any change means the pair has to be checked again
  }

  async function onVerify() {
    setCheck({ status: "checking" });
    try {
      await verify(creds);
      setCheck({ status: "valid" });
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
      await generate(creds, form, (piece) => setText((t) => t + piece), controller.signal);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
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
      </div>
      <ResultPanel text={text} busy={busy} error={error} fileName={fileName} />
    </div>
  );
}
