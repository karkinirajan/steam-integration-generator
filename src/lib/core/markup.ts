/**
 * Turn the model's light Markdown (`**bold**`, `*italic*`, `#` headings, bullets) into lines of styled runs.
 * One parser feeds the screen, the DOCX export and the PDF export, so they cannot drift apart.
 */

export type Run = { text: string; bold: boolean; italic: boolean };
export type Line = { kind: "heading" | "bullet" | "text" | "blank"; runs: Run[]; level: number };

const HASH_HEADING = /^(#{1,6})\s+(.*)$/;
const BOLD_LINE = /^\*\*(.+?)\*\*:?$/;
const BULLET = /^[*\-•]\s+(.*)$/;

const run = (text: string, bold = false, italic = false): Run => ({ text, bold, italic });
const isSpace = (ch: string) => /\s/.test(ch);

/**
 * The inline rules as a regex, kept as the reference: `parseInline` implements them in linear time and the tests check the
 * two agree. The regex itself re-scans the rest of the line from every unclosed `*`, which is quadratic.
 */
export const INLINE_REFERENCE = /\*\*(?=\S)(.+?)(?<=\S)\*\*|\*(?=[^\s*])(.+?)(?<=[^\s*])\*/g;

/** For every index k, the first closing `**` (bold) and closing `*` (italic) at or after k, or -1. One right-to-left pass. */
function nextClosers(text: string): [Int32Array, Int32Array] {
  const n = text.length;
  const bold = new Int32Array(n + 2).fill(-1);
  const italic = new Int32Array(n + 2).fill(-1);
  for (let k = n - 1; k > 0; k--) {
    const before = text[k - 1];
    bold[k] = text.startsWith("**", k) && !isSpace(before) ? k : bold[k + 1];
    italic[k] = text[k] === "*" && !isSpace(before) && before !== "*" ? k : italic[k + 1];
  }
  return [bold, italic];
}

/**
 * Split a line into plain, bold and italic runs. An unmatched `*` stays as written. Scans left to right, trying bold before
 * italic at each position: an opener must touch its text, a closer must too, and the first closer after at least one
 * character of content wins.
 */
export function parseInline(text: string): Run[] {
  const [boldClose, italicClose] = nextClosers(text);
  const runs: Run[] = [];
  const n = text.length;
  let position = 0;
  let start = 0;
  while (start < n) {
    if (text[start] !== "*") {
      start++;
      continue;
    }
    let after = start + 2 < n ? text[start + 2] : "";
    if (text.startsWith("**", start) && after && !isSpace(after)) {
      const close = start + 3 <= n ? boldClose[start + 3] : -1;
      if (close !== -1) {
        if (start > position) runs.push(run(text.slice(position, start)));
        runs.push(run(text.slice(start + 2, close), true));
        position = start = close + 2;
        continue;
      }
    }
    after = start + 1 < n ? text[start + 1] : "";
    if (after && !isSpace(after) && after !== "*") {
      const close = start + 2 <= n ? italicClose[start + 2] : -1;
      if (close !== -1) {
        if (start > position) runs.push(run(text.slice(position, start)));
        runs.push(run(text.slice(start + 1, close), false, true));
        position = start = close + 1;
        continue;
      }
    }
    start++;
  }
  if (position < n) runs.push(run(text.slice(position)));
  return runs;
}

/** Parse the whole response into lines. */
export function parse(text: string): Line[] {
  const rows = text.split(/\r\n|\r|\n/);
  if (rows.at(-1) === "") rows.pop(); // a trailing newline does not start another line ("" has no lines at all)
  return rows.map((raw): Line => {
    const stripped = raw.trim();
    if (!stripped) return { kind: "blank", runs: [], level: 0 };
    const heading = HASH_HEADING.exec(stripped);
    if (heading) {
      return { kind: "heading", runs: [run(heading[2].replaceAll("**", ""), true)], level: heading[1].length === 1 ? 1 : 2 };
    }
    const boldLine = BOLD_LINE.exec(stripped);
    if (boldLine) return { kind: "heading", runs: [run(boldLine[1], true)], level: 2 };
    const bullet = BULLET.exec(stripped);
    if (bullet) return { kind: "bullet", runs: parseInline(bullet[1]), level: 0 };
    return { kind: "text", runs: parseInline(stripped), level: 0 };
  });
}
