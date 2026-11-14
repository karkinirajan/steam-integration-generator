import { SseParser } from "./sse.ts";

/** Mirrors backend/app/core/markup.py: one line model drives the screen and both export formats. */
export type Run = { text: string; bold: boolean; italic: boolean };
export type Line = { kind: "heading" | "bullet" | "text" | "blank"; runs: Run[]; level: number };
export type Rendered = { text: string; lines: Line[] };

export type Options = { output_types: string[]; languages: string[]; model: string };

export type GenerateForm = {
  topic: string;
  outcomes: string;
  age_group: string;
  output_type: string;
  time_minutes: string;
  location: string;
  language: string;
};

export type ExportFormat = "docx" | "pdf";

/** Requests go to the same origin; Next.js (dev) or the reverse proxy (production) forwards /api to FastAPI. */
const BASE = "/api";

/** An error whose message was written for the person using the page. */
export class ApiError extends Error {}

async function errorFrom(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    if (typeof body.detail === "string") return new ApiError(body.detail);
    if (Array.isArray(body.detail)) return new ApiError("Some fields are too long or missing. Check the form.");
  } catch {
    // not JSON: fall through
  }
  return new ApiError(`The server returned an error (${response.status}). Try again shortly.`);
}

export async function getOptions(signal?: AbortSignal): Promise<Options> {
  const response = await fetch(`${BASE}/options`, { signal });
  if (!response.ok) throw await errorFrom(response);
  return (await response.json()) as Options;
}

/**
 * Stream a generation. `onChunk` receives text as the model writes it; the promise resolves with the final parsed result.
 * The key travels only in a header, to our own API, for this one request.
 */
export async function generate(
  form: GenerateForm,
  apiKey: string,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<Rendered> {
  const response = await fetch(`${BASE}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Gemini-Key": apiKey },
    body: JSON.stringify(form),
    signal,
  });
  if (!response.ok || !response.body) throw await errorFrom(response);

  const parser = new SseParser();
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    for (const { event, data } of parser.push(value)) {
      if (event === "chunk" && typeof data === "string") onChunk(data);
      else if (event === "error") throw new ApiError(String(data));
      else if (event === "done") return data as Rendered;
    }
  }
  throw new ApiError("The connection closed before the answer was complete. Try again.");
}

export async function exportFile(format: ExportFormat, text: string): Promise<Blob> {
  const response = await fetch(`${BASE}/export/${format}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) throw await errorFrom(response);
  return await response.blob();
}
