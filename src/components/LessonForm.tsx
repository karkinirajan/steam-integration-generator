import { LANGUAGES, OUTPUT_TYPES } from "@/lib/core/config.ts";
import { MAX_FIELD, MAX_OUTCOMES, type FormInput } from "@/lib/core/request.ts";

import { card, field, hint, label } from "./ui.ts";

type Props = {
  form: FormInput;
  onChange: (change: Partial<FormInput>) => void;
  onSubmit: () => void;
  onStop: () => void;
  busy: boolean;
  ready: boolean;
};

/** The original app's form: topic, outcomes, age group, output type, language, and for a lesson plan the time and place. */
export function LessonForm({ form, onChange, onSubmit, onStop, busy, ready }: Props) {
  const isPlan = form.output_type === "Lesson Plan";
  const set = (key: keyof FormInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange({ [key]: e.target.value });

  return (
    <form
      className={`${card} space-y-4`}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <h2 className="text-sm font-semibold">Lesson</h2>

      <div>
        <label className={label} htmlFor="topic">
          Topic
        </label>
        <input id="topic" className={field} value={form.topic} onChange={set("topic")} maxLength={MAX_FIELD} placeholder="Volcanoes" required />
      </div>

      <div>
        <label className={label} htmlFor="outcomes">
          Learning outcomes
        </label>
        <input
          id="outcomes"
          className={field}
          value={form.outcomes}
          onChange={set("outcomes")}
          maxLength={MAX_OUTCOMES}
          placeholder="Explain eruptions, build a model"
          required
        />
        <p className={hint}>Separate them with commas.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label} htmlFor="age">
            Age group
          </label>
          <input id="age" className={field} value={form.age_group} onChange={set("age_group")} maxLength={MAX_FIELD} placeholder="10-12" required />
        </div>
        <div>
          <label className={label} htmlFor="language">
            Language
          </label>
          <select id="language" className={field} value={form.language} onChange={set("language")}>
            {LANGUAGES.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      <fieldset>
        <legend className={label}>Output</legend>
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-field p-1">
          {OUTPUT_TYPES.map((t) => (
            <label
              key={t}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-center text-sm transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/40 ${
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
            <input id="time" type="number" min={1} step={1} className={field} value={form.time_minutes} onChange={set("time_minutes")} required />
          </div>
          <div>
            <label className={label} htmlFor="location">
              Location
            </label>
            <input id="location" className={field} value={form.location} onChange={set("location")} maxLength={MAX_FIELD} placeholder="Classroom" />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !ready}
          className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Generating…" : isPlan ? "Generate lesson plan" : "Generate ideas"}
        </button>
        {busy && (
          <button type="button" onClick={onStop} className="rounded-lg border border-line px-4 py-2.5 text-sm">
            Stop
          </button>
        )}
      </div>
      {!ready && !busy && <p className="text-center text-xs text-muted">Check your key and model first.</p>}
    </form>
  );
}
