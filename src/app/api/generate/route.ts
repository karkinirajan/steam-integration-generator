import { buildPrompt } from "@/lib/core/prompts.ts";
import { InputError, validate } from "@/lib/core/request.ts";
import { GenerationError } from "@/lib/server/errors.ts";
import { credentials, HttpProblem, problem, readJson } from "@/lib/server/http.ts";
import { streamAnswer } from "@/lib/server/llm.ts";
import { encodeEvent } from "@/lib/sse.ts";

/**
 * POST { provider, model, form } with the key in the x-api-key header. Answers with Server-Sent Events: `chunk` events
 * carrying text, then `done`, or one `error` with a message written for the user.
 */
export async function POST(request: Request): Promise<Response> {
  let prompt: string;
  let creds: ReturnType<typeof credentials>;
  try {
    const body = await readJson(request);
    creds = credentials(request, body);
    const form = body.form && typeof body.form === "object" ? (body.form as Record<string, unknown>) : {};
    prompt = buildPrompt(validate(form));
  } catch (error) {
    if (error instanceof HttpProblem) return problem(error.status, error.message);
    if (error instanceof InputError) return problem(422, error.message);
    throw error;
  }

  const { provider, model, apiKey } = creds;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => controller.enqueue(encoder.encode(encodeEvent(event, data)));
      try {
        for await (const piece of streamAnswer(provider, apiKey, model, prompt, request.signal)) send("chunk", piece);
        send("done", null);
      } catch (error) {
        send("error", error instanceof GenerationError ? error.message : "Something went wrong. Try again.");
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no", // stops Nginx holding the stream back until it ends
    },
  });
}
