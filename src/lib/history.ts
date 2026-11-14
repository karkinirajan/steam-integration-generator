import type { FormInput } from "./core/request.ts";

/** One past generation, kept in this browser only. API keys are never part of it. */
export type HistoryEntry = {
  id: string;
  createdAt: string; // ISO time
  provider: string;
  model: string;
  form: FormInput;
  text: string;
};

const STORAGE_KEY = "steam-history-v2";

/**
 * Decide what the history list looks like after a new generation.
 *
 * `entries` is newest-first. Return the new newest-first list.
 */
export function addEntry(entries: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  // TODO(you): choose the history policy. Things to weigh:
  //  - How many entries to keep? localStorage holds roughly 5 MB per site and one lesson plan is around 10-20 KB of
  //    text, so a cap still matters. The original desktop app kept 5.
  //  - Should regenerating with an identical form (and model) replace the older entry, or keep both, since the model
  //    gives a different answer each time?
  // Placeholder until then: newest first, no cap.
  return [entry, ...entries];
}

/** Read saved history. Storage can be missing or blocked (private windows, cleared site data), so failures mean empty. */
export function loadHistory(): HistoryEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

/** Save history. Returns false when the browser refused (quota or blocked storage), so the page can say so. */
export function saveHistory(entries: HistoryEntry[]): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    return true;
  } catch {
    return false;
  }
}
