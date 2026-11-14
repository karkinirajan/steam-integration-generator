/** A Server-Sent Event as the API sends it: a name and a JSON payload. */
type SseEvent = { event: string; data: unknown };

/** One event in the wire format. JSON never contains a raw newline, so the payload is always one `data:` line. */
export function encodeEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Incremental parser for a `text/event-stream` body. Network chunks can split an event anywhere, even inside a
 * multi-byte character, so text is buffered until a blank line ends an event.
 */
export class SseParser {
  private buffer = "";

  /** Feed decoded text; returns every event completed by it. */
  push(text: string): SseEvent[] {
    this.buffer += text.replace(/\r\n?/g, "\n");
    const events: SseEvent[] = [];
    let end: number;
    while ((end = this.buffer.indexOf("\n\n")) !== -1) {
      const block = this.buffer.slice(0, end);
      this.buffer = this.buffer.slice(end + 2);
      const parsed = parseBlock(block);
      if (parsed) events.push(parsed);
    }
    return events;
  }
}

function parseBlock(block: string): SseEvent | null {
  let event = "message";
  const data: string[] = [];
  for (const line of block.split("\n")) {
    if (line.startsWith(":")) continue; // comment / keep-alive
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") event = value;
    else if (field === "data") data.push(value);
  }
  if (data.length === 0) return null;
  try {
    return { event, data: JSON.parse(data.join("\n")) };
  } catch {
    return { event, data: data.join("\n") };
  }
}
