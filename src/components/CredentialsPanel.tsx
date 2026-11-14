import { PROVIDERS, findProvider } from "@/lib/core/providers.ts";

import { card, field, hint, label, secondaryButton } from "./ui.ts";

export type VerifyState = { status: "idle" | "checking" | "valid" | "invalid"; message?: string };

type Props = {
  provider: string;
  model: string;
  apiKey: string;
  verify: VerifyState;
  onChange: (change: Partial<{ provider: string; model: string; apiKey: string }>) => void;
  onVerify: () => void;
};

/** Provider, model and key: all three are the user's, and both the key and the model must check out before generating. */
export function CredentialsPanel({ provider, model, apiKey, verify, onChange, onVerify }: Props) {
  const current = findProvider(provider) ?? PROVIDERS[0];
  const busy = verify.status === "checking";
  return (
    <section className={`${card} space-y-4`} aria-labelledby="model-heading">
      <div className="flex items-center justify-between">
        <h2 id="model-heading" className="text-sm font-semibold">
          Model
        </h2>
        <Status state={verify} />
      </div>

      <div>
        <label className={label} htmlFor="provider">
          Provider
        </label>
        <select id="provider" className={field} value={current.id} onChange={(e) => onChange({ provider: e.target.value })}>
          {PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={label} htmlFor="model">
          Model name
        </label>
        <input
          id="model"
          className={field}
          value={model}
          onChange={(e) => onChange({ model: e.target.value })}
          placeholder={current.exampleModel}
          autoComplete="off"
          spellCheck={false}
        />
        <p className={hint}>The exact model id from {current.label}, for example {current.exampleModel}.</p>
      </div>

      <div>
        <label className={label} htmlFor="key">
          API key
        </label>
        <input
          id="key"
          type="password"
          className={field}
          value={apiKey}
          onChange={(e) => onChange({ apiKey: e.target.value })}
          placeholder={`Paste your ${current.label} key`}
          autoComplete="off"
          spellCheck={false}
        />
        <p className={hint}>
          Kept in this tab only, never saved. Get one from{" "}
          <a className="underline" href={current.keyUrl} target="_blank" rel="noreferrer">
            {current.label}
          </a>
          .
        </p>
      </div>

      <button type="button" onClick={onVerify} disabled={busy || !model.trim() || !apiKey.trim()} className={`${secondaryButton} w-full py-2`}>
        {busy ? "Checking…" : verify.status === "valid" ? "Checked ✓" : "Check key and model"}
      </button>
      {verify.status === "invalid" && (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {verify.message}
        </p>
      )}
    </section>
  );
}

function Status({ state }: { state: VerifyState }) {
  const styles: Record<VerifyState["status"], [string, string]> = {
    idle: ["bg-field text-muted", "Not checked"],
    checking: ["bg-field text-muted", "Checking"],
    valid: ["bg-accent/15 text-accent", "Ready"],
    invalid: ["bg-danger/10 text-danger", "Invalid"],
  };
  const [style, text] = styles[state.status];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>{text}</span>;
}
