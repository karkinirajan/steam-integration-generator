import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { findProvider, type Provider } from "../core/providers.ts";
import { describeError, GenerationError, MAX_DETAIL, NO_TEXT, scrub } from "./errors.ts";
import { credentials, HttpProblem, readJson } from "./http.ts";
import { streamAnswer } from "./llm.ts";
import { verifyCredentials, type FetchFn } from "./verify.ts";

const KEY = "sk-test-" + "k".repeat(30);
const openai = findProvider("openai")!;
const anthropic = findProvider("anthropic")!;
const google = findProvider("google")!;
const groq = findProvider("groq")!;
const openrouter = findProvider("openrouter")!;

const status = (statusCode: number, message = "boom") => Object.assign(new Error(message), { statusCode });

describe("describeError", () => {
  test("names the key, the model, limits and outages", () => {
    assert.match(describeError(status(401), openai, "m"), /OpenAI did not accept the API key/);
    assert.match(describeError(status(400, "API key not valid"), google, "m"), /did not accept the API key/);
    assert.match(describeError(status(403), openai, "gpt-x"), /not allowed to use 'gpt-x'/);
    assert.match(describeError(status(404), anthropic, "claude-x"), /Anthropic has no model called 'claude-x'/);
    assert.match(describeError(status(429), groq, "m"), /rate limit/);
    assert.match(describeError(status(503), groq, "m"), /Groq had a problem \(error 503\)/);
    assert.match(describeError(new TypeError("fetch failed"), groq, "m"), /Could not reach Groq/);
  });

  test("other errors show a short, single-line detail", () => {
    const text = describeError(status(418, "line one\nline two " + "z".repeat(1000)), openai, "m");
    assert.ok(!text.includes("\n") && text.length < MAX_DETAIL + 60);
  });

  test("the key never appears, even when the provider echoes it", () => {
    for (const code of [400, 418, 500]) assert.ok(!describeError(status(code, `bad key ${KEY}`), openai, "m", KEY).includes(KEY));
    assert.equal(scrub("token AIzaSyABCDEFGHIJKLMNOP here"), "token [key] here");
  });
});

function fakeStream(parts: Array<{ type: string; text?: string; error?: unknown }>, thrown?: unknown) {
  const calls: Array<{ prompt: string }> = [];
  const fn = (options: { prompt: string }) => {
    calls.push({ prompt: options.prompt });
    return {
      stream: (async function* () {
        for (const part of parts) yield part;
        if (thrown) throw thrown;
      })(),
    };
  };
  return { fn, calls };
}

async function collect(provider: Provider, parts: Parameters<typeof fakeStream>[0], thrown?: unknown) {
  const { fn, calls } = fakeStream(parts, thrown);
  const out: string[] = [];
  for await (const piece of streamAnswer(provider, KEY, "m", "the prompt", undefined, fn)) out.push(piece);
  return { out, calls };
}

describe("streamAnswer", () => {
  test("yields text deltas only and sends the prompt", async () => {
    const { out, calls } = await collect(openai, [{ type: "start" }, { type: "text-delta", text: "a" }, { type: "reasoning-delta", text: "hidden" }, { type: "text-delta", text: "b" }]);
    assert.deepEqual(out, ["a", "b"]);
    assert.equal(calls[0].prompt, "the prompt");
  });

  test("works for every provider kind", async () => {
    for (const p of [openai, anthropic, google, groq, openrouter]) {
      assert.deepEqual((await collect(p, [{ type: "text-delta", text: "ok" }])).out, ["ok"]);
    }
  });

  test("whitespace only is the no-text error", async () => {
    await assert.rejects(collect(openai, [{ type: "text-delta", text: "  \n" }]), new GenerationError(NO_TEXT));
  });

  test("an error part or a thrown error becomes a friendly GenerationError without the key", async () => {
    await assert.rejects(collect(openai, [{ type: "error", error: status(429) }]), /rate limit/);
    await assert.rejects(collect(openai, [{ type: "text-delta", text: "x" }], status(401, KEY)), (e: Error) => e instanceof GenerationError && !e.message.includes(KEY));
  });
});

function fakeFetch(routes: Record<string, number | unknown>) {
  const seen: Array<{ url: string; headers: Record<string, string> }> = [];
  const fn: FetchFn = async (url, init) => {
    seen.push({ url, headers: init.headers as Record<string, string> });
    const reply = routes[url];
    if (reply === undefined) throw new TypeError("fetch failed");
    if (typeof reply === "number") return new Response("err", { status: reply });
    return Response.json(reply);
  };
  return { fn, seen };
}

describe("verifyCredentials", () => {
  test("OpenAI: fetches the one model with a bearer key", async () => {
    const { fn, seen } = fakeFetch({ "https://api.openai.com/v1/models/gpt-5": { id: "gpt-5" } });
    await verifyCredentials(openai, KEY, "gpt-5", fn);
    assert.equal(seen[0].headers.Authorization, `Bearer ${KEY}`);
  });

  test("OpenAI: 401 is the key, 404 is the model", async () => {
    await assert.rejects(verifyCredentials(openai, KEY, "gpt-5", fakeFetch({ "https://api.openai.com/v1/models/gpt-5": 401 }).fn), /did not accept the API key/);
    await assert.rejects(verifyCredentials(openai, KEY, "gpt-9", fakeFetch({ "https://api.openai.com/v1/models/gpt-9": 404 }).fn), /no model called 'gpt-9'/);
  });

  test("Anthropic uses its own headers", async () => {
    const { fn, seen } = fakeFetch({ "https://api.anthropic.com/v1/models/claude-x": { id: "claude-x" } });
    await verifyCredentials(anthropic, KEY, "claude-x", fn);
    assert.equal(seen[0].headers["x-api-key"], KEY);
    assert.ok(seen[0].headers["anthropic-version"]);
  });

  test("Gemini accepts a models/ prefix and sends the key in a header, not the URL", async () => {
    const { fn, seen } = fakeFetch({ "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash": {} });
    await verifyCredentials(google, KEY, "models/gemini-3.6-flash", fn);
    assert.equal(seen[0].headers["x-goog-api-key"], KEY);
    assert.ok(!seen[0].url.includes(KEY));
  });

  test("OpenAI-compatible: the model must be in the keyed list (data[] or a bare array)", async () => {
    const list = "https://api.groq.com/openai/v1/models";
    await verifyCredentials(groq, KEY, "llama", fakeFetch({ [list]: { data: [{ id: "llama" }] } }).fn);
    await verifyCredentials(groq, KEY, "llama", fakeFetch({ [list]: [{ id: "llama" }] }).fn);
    await assert.rejects(verifyCredentials(groq, KEY, "nope", fakeFetch({ [list]: { data: [{ id: "llama" }] } }).fn), /no model called 'nope'/);
    await assert.rejects(verifyCredentials(groq, KEY, "llama", fakeFetch({ [list]: 401 }).fn), /did not accept the API key/);
  });

  test("OpenRouter checks the key on its key endpoint before the public list", async () => {
    const { fn, seen } = fakeFetch({ "https://openrouter.ai/api/v1/key": 401, "https://openrouter.ai/api/v1/models": { data: [{ id: "a/b" }] } });
    await assert.rejects(verifyCredentials(openrouter, KEY, "a/b", fn), /did not accept the API key/);
    assert.deepEqual(seen.map((s) => s.url), ["https://openrouter.ai/api/v1/key"]);
  });

  test("an unreachable provider says so", async () => {
    await assert.rejects(verifyCredentials(groq, KEY, "x", fakeFetch({}).fn), /Could not reach Groq/);
  });
});

describe("http helpers", () => {
  const req = (body: string, key?: string) =>
    new Request("http://local/api", { method: "POST", body, headers: key ? { "x-api-key": key } : {} });

  test("readJson refuses non-objects and oversized bodies", async () => {
    await assert.rejects(readJson(req("[1]")), (e: HttpProblem) => e.status === 400);
    await assert.rejects(readJson(req("{")), (e: HttpProblem) => e.status === 400);
    await assert.rejects(readJson(req(JSON.stringify({ x: "y".repeat(20_000) }))), (e: HttpProblem) => e.status === 413);
  });

  test("readJson stops reading an endless body once it passes the cap, with no Content-Length", async () => {
    let pulled = 0;
    const endless = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled++;
        controller.enqueue(new Uint8Array(4096).fill(32));
      },
    });
    const request = new Request("http://local/api", { method: "POST", body: endless, duplex: "half" } as RequestInit);
    await assert.rejects(readJson(request), (e: HttpProblem) => e.status === 413);
    assert.ok(pulled < 10, `read ${pulled} chunks`);
  });

  test("readJson refuses a declared Content-Length over the cap before reading", async () => {
    const request = new Request("http://local/api", { method: "POST", body: "{}", headers: { "content-length": "999999" } });
    await assert.rejects(readJson(request), (e: HttpProblem) => e.status === 413);
  });

  test("readJson decodes multi-byte text split across chunks", async () => {
    const bytes = new TextEncoder().encode(JSON.stringify({ topic: "नेपाली" }));
    const split = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, 13));
        controller.enqueue(bytes.slice(13));
        controller.close();
      },
    });
    const request = new Request("http://local/api", { method: "POST", body: split, duplex: "half" } as RequestInit);
    assert.deepEqual(await readJson(request), { topic: "नेपाली" });
  });

  test("credentials: a known provider, a model and a key-shaped key", () => {
    const ok = credentials(req("", `  ${KEY}  `), { provider: "groq", model: " llama " });
    assert.deepEqual([ok.provider.id, ok.model, ok.apiKey], ["groq", "llama", KEY]);
    assert.throws(() => credentials(req("", KEY), { provider: "http://evil", model: "m" }), (e: HttpProblem) => e.status === 422);
    assert.throws(() => credentials(req("", KEY), { provider: "groq", model: "" }), (e: HttpProblem) => e.status === 422);
    assert.throws(() => credentials(req(""), { provider: "groq", model: "m" }), (e: HttpProblem) => e.status === 401);
  });
});
