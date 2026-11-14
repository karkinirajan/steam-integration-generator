import type { Provider } from "../core/providers.ts";

export const MAX_DETAIL = 300;
export const NO_TEXT = "The model returned no text (a safety filter may have blocked it). Try rewording the topic.";

/** A failure with a message that is safe and useful to show the user (it never contains the API key). */
export class GenerationError extends Error {}

type StatusLike = { statusCode?: unknown; status?: unknown; message?: unknown; name?: unknown };

function statusOf(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const e = error as StatusLike;
  const code = e.statusCode ?? e.status;
  return typeof code === "number" ? code : undefined;
}

/** Remove anything shaped like a secret from provider text before it is shown. */
export function scrub(text: string, apiKey?: string): string {
  let out = text;
  if (apiKey && apiKey.length >= 8) out = out.split(apiKey).join("[key]");
  return out.replace(/\b(sk|AIza|gsk|xai)[-_A-Za-z0-9]{12,}/g, "[key]");
}

/** Turn a provider failure into a message a teacher can act on. Provider details are cut, single-lined and scrubbed. */
export function describeError(error: unknown, provider: Provider, model: string, apiKey?: string): string {
  const code = statusOf(error);
  const raw = typeof error === "object" && error !== null ? String((error as StatusLike).message ?? "") : "";
  const detail = scrub(raw.trim().replace(/\s+/g, " ").slice(0, MAX_DETAIL), apiKey);
  const name = typeof error === "object" && error !== null ? String((error as StatusLike).name ?? "") : "";

  if (name === "AbortError") return "Stopped.";
  if (code === 401 || (code === 400 && /api[ _-]?key/i.test(detail))) {
    return `${provider.label} did not accept the API key. Check the key you pasted.`;
  }
  if (code === 403) return `The API key is not allowed to use '${model}' on ${provider.label} (error 403).`;
  if (code === 404) return `${provider.label} has no model called '${model}'. Check the model name.`;
  if (code === 402) return `${provider.label} says the account has no credit left (error 402).`;
  if (code === 429) return "The rate limit or quota was reached. Wait a minute and try again, or check your plan's limits.";
  if (code !== undefined && code >= 500) return `${provider.label} had a problem (error ${code}). Try again shortly.`;
  if (code !== undefined) return `${provider.label} returned an error (${code}): ${detail}`;
  return `Could not reach ${provider.label}. Check your internet connection and try again.`;
}
