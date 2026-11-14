import { useMemo, useState } from "react";

import { parse } from "@/lib/core/markup.ts";
import { pdfCanRender, toDocx, toPdf } from "@/lib/exports.ts";

import { ResultView } from "./ResultView";
import { card, secondaryButton } from "./ui.ts";

type Props = { text: string; busy: boolean; error: string; fileName: string };

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** The answer, styled as it streams in, with DOCX, PDF and copy actions once it is complete. */
export function ResultPanel({ text, busy, error, fileName }: Props) {
  const lines = useMemo(() => parse(text), [text]);
  const [notice, setNotice] = useState("");
  const done = Boolean(text) && !busy;
  const pdfOk = pdfCanRender(text);

  async function act(action: () => Promise<void> | void) {
    setNotice("");
    try {
      await action();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "That did not work. Try again.");
    }
  }

  return (
    <section className={`${card} min-h-[60vh] p-6`} aria-live="polite" aria-busy={busy}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Result</h2>
        {done && (
          <div className="flex flex-wrap gap-2">
            <button className={secondaryButton} onClick={() => act(async () => download(await toDocx(text), `${fileName}.docx`))}>
              Download DOCX
            </button>
            <button
              className={secondaryButton}
              disabled={!pdfOk}
              title={pdfOk ? undefined : "PDF cannot show Nepali letters. Use DOCX."}
              onClick={() => act(() => download(toPdf(text), `${fileName}.pdf`))}
            >
              Download PDF
            </button>
            <button className={secondaryButton} onClick={() => act(async () => (await navigator.clipboard.writeText(text), setNotice("Copied.")))}>
              Copy
            </button>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      {notice && <p className="mb-4 text-sm text-muted">{notice}</p>}
      {done && !pdfOk && <p className="mb-4 text-xs text-muted">PDF cannot show Nepali letters; the DOCX keeps them.</p>}

      {text ? (
        <ResultView lines={lines} />
      ) : busy ? (
        <p className="animate-pulse text-sm text-muted">Waiting for the model…</p>
      ) : error ? null : (
        <div className="flex min-h-[40vh] flex-col items-center justify-center text-center text-muted">
          <p className="text-base">Choose a model, then fill in the lesson to generate STEAM ideas or a 5E lesson plan.</p>
          <p className="mt-1 text-sm">Science · Technology · Engineering · Arts · Mathematics</p>
        </div>
      )}
    </section>
  );
}
