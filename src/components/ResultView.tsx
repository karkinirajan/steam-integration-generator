import type { Line, Run } from "@/lib/core/markup.ts";

function Runs({ runs }: { runs: Run[] }) {
  return runs.map((run, i) => {
    let node: React.ReactNode = run.text;
    if (run.italic) node = <em>{node}</em>;
    if (run.bold) node = <strong>{node}</strong>;
    return <span key={i}>{node}</span>;
  });
}

/**
 * Renders the parsed line model the backend sends with its final event: the same lines the DOCX and PDF are built from,
 * so the screen and the files agree. Text is rendered as React text nodes, never as HTML.
 */
export function ResultView({ lines }: { lines: Line[] }) {
  const blocks: React.ReactNode[] = [];
  let bullets: Line[] = [];
  const flush = () => {
    if (bullets.length) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="my-2 list-disc space-y-1 pl-6">
          {bullets.map((line, i) => (
            <li key={i}>
              <Runs runs={line.runs} />
            </li>
          ))}
        </ul>,
      );
      bullets = [];
    }
  };
  lines.forEach((line, i) => {
    if (line.kind === "bullet") {
      bullets.push(line);
      return;
    }
    flush();
    if (line.kind === "heading") {
      const Tag = line.level === 1 ? "h2" : "h3";
      blocks.push(
        <Tag key={i} className={line.level === 1 ? "mt-6 mb-2 text-xl font-semibold" : "mt-4 mb-1 text-lg font-semibold"}>
          <Runs runs={line.runs} />
        </Tag>,
      );
    } else if (line.kind === "text") {
      blocks.push(
        <p key={i} className="my-2 leading-relaxed">
          <Runs runs={line.runs} />
        </p>,
      );
    }
  });
  flush();
  return <div className="text-[0.95rem]">{blocks}</div>;
}
