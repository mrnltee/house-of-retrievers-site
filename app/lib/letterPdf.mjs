/**
 * Draws a filled-in letter (blocks from `letters.mjs`) as an A4 PDF: HOR's
 * logo on the first page, Times for the text (a classic letter face that every
 * PDF reader has, so nothing needs embedding), page numbers in the footer.
 * Server only. `₱` becomes "PHP " and `☐` "[  ]", because the standard PDF
 * fonts have neither sign.
 */
import PDFDocument from "pdfkit";
import { LETTER_LOGO_PNG } from "./letters/logo.mjs";

const INK = "#1F1B16";
const GOLD = "#7A5C1F";
const RULE = "#C9B48A";
const HEAD_FILL = "#F3EBDD";
const SIZE = 10.5;
const MARGIN = 60;

let logo = null;
const logoImage = () => (logo ??= Buffer.from(LETTER_LOGO_PNG, "base64"));

// Characters the standard (WinAnsi) PDF fonts can show; anything else is replaced or dropped.
const LINE_SEPARATORS = new RegExp(`[${String.fromCharCode(0x2028, 0x2029)}]`, "g");
const WINANSI_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
export function pdfSafe(text) {
  return String(text || "")
    .replace(/₱\s?/g, "PHP ")
    .replace(/☐/g, "[  ]")
    .replace(LINE_SEPARATORS, "\n")
    .replace(/[‐‑‒]/g, "-")
    .replace(/[ ]/g, " ")
    .split("")
    .filter((ch) => {
      const c = ch.charCodeAt(0);
      return ch === "\n" || (c >= 0x20 && c <= 0x7e) || (c >= 0xa0 && c <= 0xff) || WINANSI_EXTRA.includes(ch);
    })
    .join("");
}

const font = (bold) => (bold ? "Times-Bold" : "Times-Roman");

/** Writes runs at the current position (or x, y), wrapping in `width`. */
function writeRuns(doc, runs, { x, y, width, align = "left", size = SIZE, color = INK, gap = 2 } = {}) {
  const parts = runs.length ? runs : [{ text: " ", bold: false }];
  parts.forEach((run, i) => {
    doc.font(font(run.bold)).fontSize(size).fillColor(color);
    const opts = { width, align, lineGap: gap, continued: i < parts.length - 1 };
    if (i === 0 && x != null) doc.text(pdfSafe(run.text), x, y, opts);
    else doc.text(pdfSafe(run.text), opts);
  });
}

const plain = (runs) => pdfSafe(runs.map((r) => r.text).join(""));

function cellHeight(doc, runs, width, bold) {
  doc.font(font(bold || runs.some((r) => r.bold))).fontSize(SIZE - 0.5);
  return doc.heightOfString(plain(runs) || " ", { width, lineGap: 1.5 });
}

function drawTable(doc, rows) {
  const left = doc.page.margins.left;
  const full = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const cols = Math.max(...rows.map((r) => r.cells.length));
  // The first column holds labels; give it a little more room when there are many columns.
  const weights = Array.from({ length: cols }, (_, i) => (i === 0 ? (cols > 2 ? 1.35 : 0.8) : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map((w) => (w / total) * full);
  const pad = 4;
  const bottom = () => doc.page.height - doc.page.margins.bottom;
  const header = rows.find((r) => r.header);

  const rowHeight = (row) => Math.max(...widths.map((w, i) => cellHeight(doc, row.cells[i] || [], w - pad * 2, row.header))) + pad * 2;
  const drawRow = (row, next) => {
    const h = rowHeight(row);
    // A header row never sits alone at the foot of a page: it needs room for the row under it.
    const need = row.header && next ? h + rowHeight(next) : h;
    if (doc.y + need > bottom()) {
      doc.addPage();
      if (header && row !== header) drawRow(header);
    }
    const y = doc.y;
    let x = left;
    widths.forEach((w, i) => {
      if (row.header) doc.rect(x, y, w, h).fill(HEAD_FILL);
      doc.lineWidth(0.5).strokeColor(RULE).rect(x, y, w, h).stroke();
      const runs = (row.cells[i] || []).map((r) => ({ ...r, bold: r.bold || row.header }));
      writeRuns(doc, runs, { x: x + pad, y: y + pad, width: w - pad * 2, size: SIZE - 0.5, gap: 1.5 });
      x += w;
    });
    doc.x = left;
    doc.y = y + h;
  };

  rows.forEach((row, i) => drawRow(row, rows[i + 1]));
  doc.moveDown(0.6);
}

/** Renders letter blocks to a PDF; resolves to a Buffer. */
export function letterPdf(blocks, { title = "House of Retrievers letter" } = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margins: { top: MARGIN, bottom: MARGIN + 10, left: MARGIN, right: MARGIN }, bufferPages: true, info: { Title: pdfSafe(title), Author: "The House of Retrievers Society Inc." } });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;
    const image = logoImage();
    if (image) {
      const w = 150;
      doc.image(image, (doc.page.width - w) / 2, MARGIN - 20, { width: w });
      doc.y = MARGIN - 20 + w * (242 / 600) + 10;
    }
    doc.moveTo(left, doc.y).lineTo(left + width, doc.y).lineWidth(0.75).strokeColor(RULE).stroke();
    doc.moveDown(1.2);

    const room = () => doc.page.height - doc.page.margins.bottom - doc.y;
    for (const block of blocks) {
      if (block.type === "page") { doc.addPage(); continue; }
      // Headings keep company with what follows them.
      if ((block.type === "h1" || block.type === "h2") && room() < 110) doc.addPage();
      if (block.type === "table") { drawTable(doc, block.rows); continue; }
      doc.x = left;
      if (block.type === "h1") {
        doc.moveDown(0.3);
        writeRuns(doc, block.runs.map((r) => ({ ...r, bold: true })), { width, align: "center", size: 14, color: GOLD });
        doc.moveDown(0.6);
      } else if (block.type === "h2") {
        doc.moveDown(0.4);
        writeRuns(doc, block.runs.map((r) => ({ ...r, bold: true })), { width, size: SIZE + 0.5, color: GOLD });
        doc.moveDown(0.35);
      } else if (block.type === "center") {
        writeRuns(doc, block.runs, { width, align: "center" });
        doc.moveDown(0.5);
      } else if (block.type === "bullet") {
        const y = doc.y;
        doc.font(font(false)).fontSize(SIZE).fillColor(INK).text("•", left + 4, y);
        writeRuns(doc, block.runs, { x: left + 18, y, width: width - 18 });
        doc.moveDown(0.4);
      } else {
        writeRuns(doc, block.runs, { width });
        doc.moveDown(0.7);
      }
    }

    // Page numbers once the length is known.
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      // The footer sits inside the bottom margin; without this pdfkit adds a blank page per footer.
      doc.page.margins.bottom = 0;
      const y = doc.page.height - MARGIN + 18;
      doc.font("Times-Roman").fontSize(8.5).fillColor("#8A8073")
        .text(`The House of Retrievers Society Inc. · Page ${i + 1} of ${range.count}`, left, y, { width, align: "center", lineBreak: false });
    }
    doc.end();
  });
}
