import type { HistoryEntry } from "@/lib/history.ts";

import { card } from "./ui.ts";

type Props = { entries: HistoryEntry[]; onOpen: (entry: HistoryEntry) => void; onClear: () => void };

export function HistoryPanel({ entries, onOpen, onClear }: Props) {
  return (
    <section className={card}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">History</h2>
        {entries.length > 0 && (
          <button onClick={onClear} className="text-xs text-muted hover:text-fg">
            Clear
          </button>
        )}
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-muted">Your generations appear here. They stay in this browser.</p>
      ) : (
        <ul className="space-y-1">
          {entries.map((h) => (
            <li key={h.id}>
              <button onClick={() => onOpen(h)} className="w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-field">
                <span className="font-medium">{h.form.topic}</span>
                <span className="block text-xs text-muted">
                  {h.form.output_type} · {h.form.language} · {h.model} · {new Date(h.createdAt).toLocaleDateString()}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
