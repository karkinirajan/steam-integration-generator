import type { Provider } from "../core/providers.ts";
import { describeError, GenerationError } from "./errors.ts";

/** `fetch`, replaceable so tests run without a network. */
export type FetchFn = (url: string, init: RequestInit) => Promise<Response>;

const TIMEOUT_MS = 10_000;
const ANTHROPIC_VERSION = "2023-06-01";

class HttpError extends Error {
  readonly statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function get(fetchFn: FetchFn, url: string, headers: Record<string, string>): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchFn(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  } catch {
    throw new Error("network"); // no status: describeError reports it as unreachable
  }
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new HttpError(response.status, body);
  }
  return response.json().catch(() => ({}));
}

function modelIds(listing: unknown): string[] {
  const items = Array.isArray(listing) ? listing : ((listing as { data?: unknown })?.data ?? []);
  return Array.isArray(items) ? items.map((m) => String((m as { id?: unknown })?.id ?? "")).filter(Boolean) : [];
}

/**
 * Check that a key works and that the model exists for it, without generating anything (no tokens are spent).
 *
 * - OpenAI, Anthropic, Gemini: fetch the one model with the key. 401/403 means the key, 404 means the model.
 * - OpenAI-compatible vendors: list the models with the key (rejects a bad key), then look for the model in the list.
 * - OpenRouter: its model list is public, so the key is checked on its own key endpoint first.
 *
 * Only hosts from the fixed provider list are contacted. Throws GenerationError with a message for the user.
 */
export async function verifyCredentials(provider: Provider, apiKey: string, model: string, fetchFn: FetchFn = fetch): Promise<void> {
  const bearer = { Authorization: `Bearer ${apiKey}` };
  try {
    switch (provider.kind) {
      case "openai":
        await get(fetchFn, `${provider.baseURL}/models/${encodeURIComponent(model)}`, bearer);
        return;
      case "anthropic":
        await get(fetchFn, `https://api.anthropic.com/v1/models/${encodeURIComponent(model)}`, {
          "x-api-key": apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
        });
        return;
      case "google":
        await get(
          fetchFn,
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model.replace(/^models\//, ""))}`,
          { "x-goog-api-key": apiKey },
        );
        return;
      case "openai-compatible": {
        if (provider.id === "openrouter") await get(fetchFn, `${provider.baseURL}/key`, bearer);
        const ids = modelIds(await get(fetchFn, `${provider.baseURL}/models`, bearer));
        if (!ids.includes(model)) throw new HttpError(404, "model not listed");
        return;
      }
    }
  } catch (error) {
    throw new GenerationError(describeError(error, provider, model, apiKey));
  }
}
