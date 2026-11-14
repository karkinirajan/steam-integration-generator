/** Browser client for this app's own route handlers. The key goes only to them, in a header, for one request. */
import type { FormInput } from "./core/request.ts";
import { SseParser } from "./sse.ts";

export type Credentials = { provider: string; model: string; apiKey: string };

/** An error whose message was written for the person using the page. */
export class ApiError extends Error {}

async function errorFrom(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    if (typeof body.detail === "string") return new ApiError(body.detail);
  } catch {
    // not JSON: fall through
  }
  return new ApiError(`The server returned an error (${response.status}). Try again shortly.`);
}

function post(path: string, creds: Credentials, body: object, signal?: AbortSignal): Promise<Response> {
  return fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": creds.apiKey },
    body: JSON.stringify({ provider: creds.provider, model: creds.model, ...body }),
    signal,
  });
}

/** Resolve when the provider accepts the key and knows the model; otherwise throw an ApiError saying which is wrong. */
export async function verify(creds: Credentials, signal?: AbortSignal): Promise<void> {
  const response = await post("/api/verify", creds, {}, signal);
  if (!response.ok) throw await errorFrom(response);
}

/** Stream a generation. `onChunk` receives text as the model writes it; resolves with the full text. */
export async function generate(
  creds: Credentials,
  form: FormInput,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const response = await post("/api/generate", creds, { form }, signal);
  if (!response.ok || !response.body) throw await errorFrom(response);

  const parser = new SseParser();
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let text = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    for (const { event, data } of parser.push(value)) {
      if (event === "chunk" && typeof data === "string") {
        text += data;
        onChunk(data);
      } else if (event === "error") throw new ApiError(String(data));
      else if (event === "done") return text;
    }
  }
  throw new ApiError("The connection closed before the answer was complete. Try again.");
}
