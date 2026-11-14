import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { INLINE_REFERENCE, parse, parseInline, type Run } from "./markup.ts";
import { buildPrompt } from "./prompts.ts";
import { looksLikeApiKey, looksLikeModelId, PROVIDERS, findProvider } from "./providers.ts";
import { DEFAULT_LOCATION, InputError, MAX_FIELD, parseOutcomes, validate } from "./request.ts";

const FORM = { topic: " Volcanoes ", outcomes: "explain eruptions, , model magma ", age_group: " 10-12 ", output_type: "Ideas" };

describe("validate", () => {
  test("trims and splits the form", () => {
    const r = validate(FORM);
    assert.equal(r.topic, "Volcanoes");
    assert.deepEqual(r.outcomes, ["explain eruptions", "model magma"]);
    assert.equal(r.ageGroup, "10-12");
    assert.equal(r.timeMinutes, null);
    assert.equal(r.language, "English");
    assert.equal(r.location, DEFAULT_LOCATION);
  });

  for (const blank of ["topic", "outcomes", "age_group"] as const) {
    test(`a blank ${blank} is refused`, () => {
      assert.throws(() => validate({ ...FORM, [blank]: blank === "outcomes" ? " , " : "   " }), new InputError("Please fill in all fields."));
    });
  }

  test("unknown output types and languages are refused", () => {
    assert.throws(() => validate({ ...FORM, output_type: "Essay" }), /Choose an output type: Ideas or Lesson Plan/);
    assert.throws(() => validate({ ...FORM, language: "French" }), /Choose a language: English or Nepali/);
  });

  test("a lesson plan needs a positive whole number of minutes", () => {
    const plan = { ...FORM, output_type: "Lesson Plan" };
    assert.throws(() => validate(plan), /provide a value for class time/);
    assert.throws(() => validate({ ...plan, time_minutes: "4.5" }), /valid integer/);
    assert.throws(() => validate({ ...plan, time_minutes: "abc" }), /valid integer/);
    assert.throws(() => validate({ ...plan, time_minutes: "0" }), /greater than zero/);
    assert.equal(validate({ ...plan, time_minutes: " 45 " }).timeMinutes, 45);
  });

  test("time is ignored for ideas", () => {
    assert.equal(validate({ ...FORM, time_minutes: "nonsense" }).timeMinutes, null);
  });

  test("oversized or non-text fields are refused", () => {
    assert.throws(() => validate({ ...FORM, topic: "x".repeat(MAX_FIELD + 1) }), /too long/);
    assert.throws(() => validate({ ...FORM, topic: 42 }), /unexpected shape/);
  });

  test("parseOutcomes drops blanks", () => {
    assert.deepEqual(parseOutcomes(" a ,b,, "), ["a", "b"]);
  });
});

describe("buildPrompt", () => {
  test("ideas: topic, age and outcomes, no time sentence without a time", () => {
    const p = buildPrompt(validate(FORM));
    assert.match(p, /for the topic: "Volcanoes" tailored exactly for learners of age 10-12 years/);
    assert.match(p, /explain eruptions, model magma\./);
    assert.doesNotMatch(p, /minutes/);
    assert.doesNotMatch(p, /Write the entire response in/);
  });

  test("lesson plan: the 5E sections, time and location", () => {
    const p = buildPrompt(validate({ ...FORM, output_type: "Lesson Plan", time_minutes: "40", location: "Lab" }));
    for (const part of ["Engage", "Explore", "Explain", "Elaborate", "Evaluate", "Materials Needed", "STEAM Integration"]) {
      assert.match(p, new RegExp(`\\*\\*${part}\\*\\*`));
    }
    assert.match(p, /The classroom session is 40 minutes long/);
    assert.match(p, /Location Name: Lab/);
  });

  test("another language is requested directly, keeping the markers", () => {
    assert.match(buildPrompt(validate({ ...FORM, language: "Nepali" })), /Write the entire response in Nepali, keeping the same structure/);
  });
});

describe("providers", () => {
  test("ids are unique and every OpenAI-style provider has an https base URL", () => {
    assert.equal(new Set(PROVIDERS.map((p) => p.id)).size, PROVIDERS.length);
    for (const p of PROVIDERS) {
      if (p.kind === "openai" || p.kind === "openai-compatible") assert.match(p.baseURL ?? "", /^https:\/\//);
    }
  });

  test("unknown providers are not found", () => {
    assert.equal(findProvider("evil"), undefined);
    assert.equal(findProvider("groq")?.label, "Groq");
  });

  test("key and model shapes", () => {
    assert.ok(looksLikeApiKey("sk-proj-abcdefghijklmnop1234"));
    assert.ok(looksLikeApiKey("  AIzaSyABCDEFGHIJKLMNOPQRSTU  "));
    for (const bad of [null, undefined, "", "short", "has spaces in the middle of it", "x".repeat(600)]) assert.ok(!looksLikeApiKey(bad));
    for (const ok of ["gpt-5", "claude-sonnet-5-5", "openai/gpt-5:free", "models/gemini-3.6-flash"]) assert.ok(looksLikeModelId(ok));
    for (const bad of ["", "two words", "a?b", "x".repeat(201)]) assert.ok(!looksLikeModelId(bad));
  });
});

const r = (text: string, bold = false, italic = false): Run => ({ text, bold, italic });

function byReference(text: string): Run[] {
  const runs: Run[] = [];
  let position = 0;
  for (const m of text.matchAll(INLINE_REFERENCE)) {
    if (m.index > position) runs.push(r(text.slice(position, m.index)));
    runs.push(m[1] !== undefined ? r(m[1], true) : r(m[2], false, true));
    position = m.index + m[0].length;
  }
  if (position < text.length) runs.push(r(text.slice(position)));
  return runs;
}

describe("markup", () => {
  test("inline styles", () => {
    assert.deepEqual(parseInline("a **b** *c* d"), [r("a "), r("b", true), r(" "), r("c", false, true), r(" d")]);
    assert.deepEqual(parseInline("2 * 3 * 4"), [r("2 * 3 * 4")]);
    assert.deepEqual(parseInline("**open"), [r("**open")]);
    assert.deepEqual(parseInline(""), []);
  });

  test("the linear scan agrees with the reference regex on every short string", () => {
    const alphabet = ["*", " ", "a"];
    const walk = (prefix: string, depth: number) => {
      if (prefix) assert.deepEqual(parseInline(prefix), byReference(prefix), JSON.stringify(prefix));
      if (depth === 0) return;
      for (const ch of alphabet) walk(prefix + ch, depth - 1);
    };
    walk("", 7);
  });

  test("and on random longer strings", () => {
    let seed = 1234;
    const next = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
    const alphabet = "**  ab\t:x";
    for (let i = 0; i < 3000; i++) {
      let text = "";
      const length = 1 + Math.floor(next() * 40);
      for (let j = 0; j < length; j++) text += alphabet[Math.floor(next() * alphabet.length)];
      assert.deepEqual(parseInline(text), byReference(text), JSON.stringify(text));
    }
  });

  for (const unit of ["*a ", "**a ", "* a*", "a** "]) {
    test(`unclosed openers take linear time (${JSON.stringify(unit)})`, () => {
      const started = performance.now();
      parseInline(unit.repeat(100_000));
      assert.ok(performance.now() - started < 2000);
    });
  }

  test("lines: headings, bold lines, bullets, blanks", () => {
    const lines = parse("# Big **x**\n## Small\n**Engage**:\n* one *i*\n- two\n• three\n\nplain\r\n");
    assert.deepEqual(
      lines.map((l) => [l.kind, l.level, l.runs.map((x) => x.text).join("")]),
      [
        ["heading", 1, "Big x"],
        ["heading", 2, "Small"],
        ["heading", 2, "Engage"],
        ["bullet", 0, "one i"],
        ["bullet", 0, "two"],
        ["bullet", 0, "three"],
        ["blank", 0, ""],
        ["text", 0, "plain"],
      ],
    );
  });

  test("*not a bullet without a space, and empty text has no lines", () => {
    assert.equal(parse("*word*")[0].kind, "text");
    assert.deepEqual(parse(""), []);
  });
});
