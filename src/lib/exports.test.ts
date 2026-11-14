import assert from "node:assert/strict";
import { test } from "node:test";

import { Packer } from "docx";
import { strFromU8, unzipSync } from "fflate";

import { docxDocument, pdfCanRender, pdfDocument } from "./exports.ts";

const SAMPLE = "# Big heading\n**Engage**\nSome **bold** and *slanted* words.\n* first point\n\nlast";

test("pdfCanRender: Latin text and Windows-1252 punctuation yes, Devanagari no", () => {
  assert.ok(pdfCanRender("café – “quotes” • €5"));
  assert.ok(!pdfCanRender("नेपाली"));
});

test("DOCX keeps every line, the words between styles, and Nepali text", async () => {
  const zip = unzipSync(new Uint8Array(await Packer.toBuffer(docxDocument(SAMPLE + "\nपाठ"))));
  const xml = strFromU8(zip["word/document.xml"]);
  for (const word of ["Big heading", "Engage", "Some ", "bold", " and ", "slanted", "first point", "last", "पाठ"]) assert.ok(xml.includes(word), word);
  assert.match(xml, /<w:t xml:space="preserve"> and <\/w:t>/); // Word drops unpreserved edge spaces
  assert.match(xml, /<w:b\/>/);
  assert.match(xml, /<w:i\/>/);
  assert.match(xml, /w:numPr|bullet/i);
});

test("PDF is a PDF with the text and the bold and italic fonts", () => {
  const pdf = pdfDocument(SAMPLE);
  const data = new TextDecoder("latin1").decode(pdf.output("arraybuffer"));
  assert.ok(data.startsWith("%PDF-"));
  assert.match(data, /Helvetica-Bold/);
  assert.match(data, /Helvetica-Oblique/);
});

test("a long answer runs onto more pages", () => {
  const long = Array.from({ length: 80 }, (_, n) => `Paragraph ${n} ` + "words ".repeat(40)).join("\n");
  assert.equal(pdfDocument("short").getNumberOfPages(), 1);
  assert.ok(pdfDocument(long).getNumberOfPages() > 1);
});
