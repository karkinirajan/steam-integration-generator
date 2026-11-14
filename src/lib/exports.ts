/**
 * DOCX and PDF files built in the browser from the same parsed lines the page shows, so the screen and the files agree.
 * Nothing is sent to a server to export.
 */
import { AlignmentType, Document, Packer, Paragraph, TextRun } from "docx";
import { jsPDF } from "jspdf";

import { parse, type Line } from "./core/markup.ts";

const HEADING_POINTS = { 1: 14, 2: 12 } as const;
const BODY_POINTS = 11;

// Windows-1252 letters above Latin-1 that the PDF's built-in fonts can draw.
const CP1252_EXTRA = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");

/** False when the text has letters the PDF's built-in fonts cannot draw (Nepali, for one). DOCX has no such limit. */
export function pdfCanRender(text: string): boolean {
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    const latin1 = code < 0x80 || (code >= 0xa0 && code <= 0xff);
    if (!latin1 && !CP1252_EXTRA.has(ch)) return false;
  }
  return true;
}

export function docxDocument(markdown: string): Document {
  const paragraphs = parse(markdown).map((line) => {
    if (line.kind === "blank") return new Paragraph({});
    const size = line.kind === "heading" ? HEADING_POINTS[line.level as 1 | 2] * 2 : undefined; // half-points
    return new Paragraph({
      bullet: line.kind === "bullet" ? { level: 0 } : undefined,
      alignment: line.kind === "heading" ? undefined : AlignmentType.JUSTIFIED,
      children: line.runs.map((r) => new TextRun({ text: r.text, bold: r.bold || undefined, italics: r.italic || undefined, size })),
    });
  });
  return new Document({
    styles: { default: { document: { run: { font: "Helvetica", size: BODY_POINTS * 2 } } } },
    sections: [{ children: paragraphs }],
  });
}

export async function toDocx(markdown: string): Promise<Blob> {
  return Packer.toBlob(docxDocument(markdown));
}

// Letter page in points, matching the original exports.
const PAGE = { width: 612, height: 792, margin: 72 };
const BULLET_INDENT = 6;
const TEXT_INDENT = 18;

function fontStyle(bold: boolean, italic: boolean): string {
  if (bold && italic) return "bolditalic";
  if (bold) return "bold";
  if (italic) return "italic";
  return "normal";
}

/** Lay out one line's runs word by word, wrapping at the right margin and starting new pages as needed. */
function drawLine(pdf: jsPDF, line: Line, cursor: { y: number }, size: number, left: number) {
  const right = PAGE.width - PAGE.margin;
  const height = size * 1.35;
  const newRow = () => {
    cursor.y += height;
    if (cursor.y > PAGE.height - PAGE.margin) {
      pdf.addPage();
      cursor.y = PAGE.margin + size;
    }
  };
  let x = left;
  pdf.setFontSize(size);
  for (const run of line.runs) {
    pdf.setFont("helvetica", fontStyle(run.bold, run.italic));
    for (const piece of run.text.split(/(\s+)/)) {
      if (!piece) continue;
      const width = pdf.getTextWidth(piece);
      if (/^\s+$/.test(piece)) {
        if (x > left) x += width; // no spaces at the start of a row
        continue;
      }
      if (x + width > right && x > left) {
        newRow();
        x = left;
      }
      pdf.text(piece, x, cursor.y);
      x += width;
    }
  }
  newRow();
}

export function pdfDocument(markdown: string): jsPDF {
  const pdf = new jsPDF({ unit: "pt", format: "letter", compress: true });
  const cursor = { y: PAGE.margin + BODY_POINTS };
  for (const line of parse(markdown)) {
    if (line.kind === "blank") {
      cursor.y += 6;
    } else if (line.kind === "heading") {
      cursor.y += 6;
      drawLine(pdf, line, cursor, HEADING_POINTS[line.level as 1 | 2], PAGE.margin);
      cursor.y += 4;
    } else if (line.kind === "bullet") {
      pdf.setFont("helvetica", "normal").setFontSize(BODY_POINTS);
      pdf.text("•", PAGE.margin + BULLET_INDENT, cursor.y);
      drawLine(pdf, line, cursor, BODY_POINTS, PAGE.margin + TEXT_INDENT);
    } else {
      drawLine(pdf, line, cursor, BODY_POINTS, PAGE.margin);
    }
    if (cursor.y > PAGE.height - PAGE.margin) {
      pdf.addPage();
      cursor.y = PAGE.margin + BODY_POINTS;
    }
  }
  return pdf;
}

export function toPdf(markdown: string): Blob {
  if (!pdfCanRender(markdown)) throw new Error("PDF cannot show these letters (Nepali, for one). Download a DOCX instead.");
  return pdfDocument(markdown).output("blob");
}
