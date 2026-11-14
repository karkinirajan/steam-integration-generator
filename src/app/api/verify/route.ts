import { GenerationError } from "@/lib/server/errors.ts";
import { credentials, HttpProblem, problem, readJson } from "@/lib/server/http.ts";
import { verifyCredentials } from "@/lib/server/verify.ts";

/** POST { provider, model } with the key in the x-api-key header → 200 when both the key and the model are valid. */
export async function POST(request: Request): Promise<Response> {
  try {
    const { provider, model, apiKey } = credentials(request, await readJson(request));
    await verifyCredentials(provider, apiKey, model);
    return Response.json({ ok: true, provider: provider.id, model }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof HttpProblem) return problem(error.status, error.message);
    if (error instanceof GenerationError) return problem(422, error.message);
    return problem(500, "Something went wrong while checking. Try again.");
  }
}
