import { findProvider, looksLikeApiKey, looksLikeModelId, type Provider } from "../core/providers.ts";

/** Header carrying the caller's own key. It is used for one call and never logged or stored. */
export const KEY_HEADER = "x-api-key";

/** Largest request body accepted, in bytes. The form is small; this only stops abuse. */
const MAX_BODY = 16_384;

export class HttpProblem extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function problem(status: number, detail: string): Response {
  return Response.json({ detail }, { status, headers: { "Cache-Control": "no-store" } });
}

const TOO_LARGE = "The request is too large.";

/**
 * Read the body, stopping as soon as it passes MAX_BODY bytes. `request.text()` would buffer the whole body first, so a
 * huge upload would be held in memory before it could be refused.
 */
async function readCapped(request: Request): Promise<string> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY) throw new HttpProblem(413, TOO_LARGE);
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY) {
      await reader.cancel().catch(() => {});
      throw new HttpProblem(413, TOO_LARGE);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const text = await readCapped(request);
  try {
    const value: unknown = JSON.parse(text);
    if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  } catch {
    // fall through
  }
  throw new HttpProblem(400, "The request was not valid JSON.");
}

/** The provider, model and key of a request, checked for shape (not yet for validity). */
export function credentials(request: Request, body: Record<string, unknown>): { provider: Provider; model: string; apiKey: string } {
  const provider = findProvider(body.provider);
  if (!provider) throw new HttpProblem(422, "Choose a provider from the list.");
  const model = typeof body.model === "string" ? body.model.trim() : "";
  if (!looksLikeModelId(model)) throw new HttpProblem(422, "Enter a model name, for example " + provider.exampleModel + ".");
  const apiKey = request.headers.get(KEY_HEADER)?.trim() ?? "";
  if (!looksLikeApiKey(apiKey)) throw new HttpProblem(401, "Enter an API key. It looks missing or mistyped.");
  return { provider, model, apiKey };
}
