import assert from "node:assert/strict";
import { test } from "node:test";

import { encodeEvent, SseParser } from "./sse.ts";

test("parses named events with JSON data", () => {
  const p = new SseParser();
  assert.deepEqual(p.push('event: chunk\ndata: "hi"\n\nevent: done\ndata: {"text":"hi"}\n\n'), [
    { event: "chunk", data: "hi" },
    { event: "done", data: { text: "hi" } },
  ]);
});

test("an event split across network chunks is held until complete", () => {
  const p = new SseParser();
  assert.deepEqual(p.push("event: chu"), []);
  assert.deepEqual(p.push('nk\ndata: "a'), []);
  assert.deepEqual(p.push('b"\n'), []);
  assert.deepEqual(p.push("\n"), [{ event: "chunk", data: "ab" }]);
});

test("CRLF line endings work", () => {
  assert.deepEqual(new SseParser().push('event: x\r\ndata: 1\r\n\r\n'), [{ event: "x", data: 1 }]);
});

test("comments and data-less blocks are skipped; the default name is message", () => {
  assert.deepEqual(new SseParser().push(": ping\n\nevent: x\n\ndata: 2\n\n"), [{ event: "message", data: 2 }]);
});

test("multi-line data is joined with newlines; non-JSON stays a string", () => {
  assert.deepEqual(new SseParser().push("data: a\ndata: b\n\n"), [{ event: "message", data: "a\nb" }]);
});

test("only one leading space is removed from a value", () => {
  assert.deepEqual(new SseParser().push('data:  " x"\n\n'), [{ event: "message", data: " x" }]);
});

test("encodeEvent round-trips through the parser, newlines included", () => {
  const p = new SseParser();
  assert.deepEqual(p.push(encodeEvent("chunk", "a\nb") + encodeEvent("done", null)), [
    { event: "chunk", data: "a\nb" },
    { event: "done", data: null },
  ]);
});
