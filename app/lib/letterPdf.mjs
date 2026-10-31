/**
 * Draws a filled-in letter (blocks from `letters.mjs`) as an A4 PDF: HOR's
 * logo on the first page, Helvetica for the text (Arial's twin, as in HOR's Word
 * letters, and built into every PDF reader, so nothing needs embedding), page numbers in the footer.
 * Server only. `₱` becomes "PHP " and `☐` "[  ]", because the standard PDF
 * fonts have neither sign.
 */
import PDFDocument from "pdfkit";
import { LETTER_LOGO_PNG } from "./letters/logo.mjs";
import { LEGAL } from "./legal.mjs";

const INK = "#1F1B16";
const GOLD = "#7A5C1F";
const RULE = "#C9B48A";
const HEAD_FILL = "#F3EBDD";
// Text size and spacing; tightened a step when a page would otherwise carry only a few spilled lines.
let SIZE = 11;
let GAP = 1;
const down = (doc, lines) => doc.moveDown(lines * GAP);
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

// HOR's Word letters use Arial 11; Helvetica is the PDF standard face with the same shapes and widths.
const font = (bold) => (bold ? "Helvetica-Bold" : "Helvetica");

/** A circle as a PDF path (four Bézier quarters), for the radio button looks. */
const circlePath = (cx, cy, r) => {
  const k = r * 0.5523;
  return `${cx + r} ${cy} m ${cx + r} ${cy + k} ${cx + k} ${cy + r} ${cx} ${cy + r} c ${cx - k} ${cy + r} ${cx - r} ${cy + k} ${cx - r} ${cy} c `
    + `${cx - r} ${cy - k} ${cx - k} ${cy - r} ${cx} ${cy - r} c ${cx + k} ${cy - r} ${cx + r} ${cy - k} ${cx + r} ${cy} c`;
};

/**
 * One choice in a pick-one list (owner, 2026-10-27: the package selection is a
 * radio button): a printed circle plus a radio widget in the table's group, so
 * choosing one clears the others. pdfkit draws no appearance for buttons (Mac
 * Preview would show nothing), so the dot is drawn here as a vector stream.
 */
function radioOption(doc, group, label, x, y, size = 10) {
  const r = size / 2;
  doc.lineWidth(0.8).strokeColor(INK).circle(x + r, y + r, r - 0.4).stroke();
  const look = (content) => {
    const ref = doc.ref({ Type: "XObject", Subtype: "Form", BBox: [0, 0, size, size], Resources: {} });
    ref.end(content);
    return ref;
  };
  const value = pdfSafe(label).replace(/[^A-Za-z0-9]+/g, "") || `Choice${group.data.Kids.length + 1}`;
  const on = look(`q 0.12 0.11 0.09 rg ${circlePath(r, r, r * 0.5)} f Q`);
  const off = look("");
  const saved = { x: doc.x, y: doc.y };
  doc.annotate(x, y, size, size, { Subtype: "Widget", F: 4, Parent: group, AS: "Off", MK: { CA: new String("l") }, AP: { N: { [value]: on, Off: off }, D: { [value]: on, Off: off } } });
  group.data.Kids.push(doc.page.annotations[doc.page.annotations.length - 1]);
  doc.x = saved.x;
  doc.y = saved.y;
}

/** The radio group for one table's choices (Ff: radio + no toggle to off). */
function radioGroup(doc, name) {
  const count = (doc._fieldCount = (doc._fieldCount || 0) + 1);
  const group = doc.ref({ FT: "Btn", Ff: 0x8000 | 0x4000, T: new String(`${name} ${count}`), V: "Off", Kids: [] });
  doc._root.data.AcroForm.data.Fields.push(group);
  return group;
}

/** A fillable text field with a unique name (readers merge fields that share one). */
function field(doc, label, x, y, w, h, options = {}) {
  const count = (doc._fieldCount = (doc._fieldCount || 0) + 1);
  const name = `${pdfSafe(label).replace(/[^A-Za-z0-9 ]+/g, " ").trim().slice(0, 40) || "Field"} ${count}`;
  const saved = { x: doc.x, y: doc.y };
  // pdfkit writes a field's own text size only when its font differs from the form's
  // default; with a set size, make it write one so viewers don't auto-size the text.
  const form = doc._acroform;
  const defaultFont = form?.defaultFont;
  if (form && options.fontSize) form.defaultFont = null;
  doc.formText(name, x, y, w, h, { fontSize: 0, ...options });
  if (form) form.defaultFont = defaultFont;
  doc.x = saved.x;
  doc.y = saved.y;
}

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
  let group = null; // the table's radio group, made at its first ☐

  const rowHeight = (row) => Math.max(...widths.map((w, i) => cellHeight(doc, row.cells[i] || [], w - pad * 2, row.header))) + pad * 2;
  // Write-in spots become fillable fields (owner, 2026-10-27): an empty cell, a ☐ box,
  // and the ____ after a label such as "Signature: ____". Lines still print for pen.
  const addFields = (row, x, y, w, h) => {
    if (row.header) return;
    const text = plain(row.cells[x.i] || []);
    const cx = x.at + pad;
    const cw = w - pad * 2;
    if (!text.trim()) {
      // A set text size: viewers otherwise grow auto-sized text to fill the box.
      field(doc, x.label, cx, y + pad - 1, cw, Math.max(h - pad * 2 + 2, 14), h > 30 ? { multiline: true, fontSize: SIZE - 1 } : { fontSize: SIZE - 1 });
    } else if (text.trim() === "[  ]") {
      group ??= radioGroup(doc, plain(header?.cells[x.i + 1] || []).trim() || "Choice");
      radioOption(doc, group, plain(row.cells[x.i + 1] || []).trim() || x.label, cx + 1, y + pad + 1.5);
    } else if (/_{3,}/.test(text)) {
      doc.font(font(false)).fontSize(SIZE - 0.5);
      const lineH = doc.currentLineHeight(true) + 1.5;
      text.split("\n").forEach((line, n) => {
        const at = line.search(/_{3,}/);
        if (at < 0) return;
        const left = doc.widthOfString(line.slice(0, at));
        // The box ends just above the printed line, so typed text sits on it, not through it.
        const top = y + pad + n * lineH;
        field(doc, line.slice(0, at).replace(/[:\s]+$/, "") || x.label, cx + left, top - 3.5, Math.max(cw - left, 40), SIZE + 1, { fontSize: SIZE - 1.5 });
      });
    }
  };

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
      const isTick = !row.header && plain(row.cells[i] || []).trim() === "[  ]";
      const runs = isTick ? [] : (row.cells[i] || []).map((r) => ({ ...r, bold: r.bold || row.header }));
      writeRuns(doc, runs, { x: x + pad, y: y + pad, width: w - pad * 2, size: SIZE - 0.5, gap: 1.5 });
      addFields(row, { i, at: x, label: plain(row.cells[0] || []).trim() || `Field ${i + 1}` }, y, w, h);
      x += w;
    });
    doc.x = left;
    doc.y = y + h;
  };

  rows.forEach((row, i) => drawRow(row, rows[i + 1]));
  group?.end();
  down(doc, 0.6);
}

/** Renders letter blocks to a PDF; resolves to a Buffer. */
const LEVELS = [{ size: 11, gap: 1 }, { size: 10.5, gap: 0.8 }, { size: 10, gap: 0.65 }];

/**
 * Renders letter blocks to a PDF; resolves to a Buffer. If a page would end up
 * holding only a few lines that spilled over (a near-empty page), it is drawn
 * again a step tighter, up to twice.
 */
export async function letterPdf(blocks, options = {}) {
  let best = null;
  for (const level of LEVELS) {
    const result = await drawLetter(blocks, options, level);
    if (!best || result.spills < best.spills) best = result;
    if (!result.spills) break;
  }
  if (options.signature && !best.signed) console.error("letter signature: switched on, but nothing was drawn (no {signature} place in the letter, or the image couldn't be read)");
  if (options.signature && best.signed) console.info(`letter signature: drawn (${best.signed}×, ${options.signature.buffer.length} bytes)`);
  return best.pdf;
}

function drawLetter(blocks, { title = "House of Retrievers letter", signature = null } = {}, level = LEVELS[0]) {
  SIZE = level.size;
  GAP = level.gap;
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margins: { top: MARGIN, bottom: MARGIN + 10, left: MARGIN, right: MARGIN }, bufferPages: true, info: { Title: pdfSafe(title), Author: "The House of Retrievers’ Society, Inc." } });
    // A transparent PNG signature is decoded by pdfkit in the background. If the file is
    // closed while that is still going, pdfkit's count of pending objects goes wrong and the
    // image is written broken (invisible in viewers; owner, 2026-10-31). So it's prepared
    // here, before anything else, and the letter is laid out once it's ready.
    let sigImage = null;
    if (signature) {
      try {
        sigImage = doc.openImage(signature.buffer);
        sigImage.embed(doc);
      } catch (error) {
        console.error(`letter signature: image couldn't be read (${error?.message || error})`);
        sigImage = null;
      }
    }
    const whenReady = (go, tries = 0) => (sigImage?.image && tries < 500 ? setTimeout(() => whenReady(go, tries + 1), 5) : go());
    whenReady(() => { try { layOut(); } catch (error) { reject(error); } });

    function layOut() {
    doc.font("Helvetica");
    doc.initForm();
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve({ pdf: Buffer.concat(chunks), spills, signed }));
    doc.on("error", reject);

    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;
    // Branding on every page, like the header in HOR's Word letters: the logo (full size on
    // page 1, smaller after) over a gold rule.
    const image = logoImage();
    const header = (w) => {
      const top = MARGIN - 28;
      if (image) doc.image(image, (doc.page.width - w) / 2, top, { width: w });
      doc.y = top + (image ? w * (242 / 600) : 0) + 8;
      doc.moveTo(left, doc.y).lineTo(left + width, doc.y).lineWidth(0.75).strokeColor(RULE).stroke();
      doc.x = left;
      down(doc, 1);
    };
    header(150);
    // Each page: did it start by overflowing (not a ---page--- break), and how full did it get?
    const pages = [{ auto: false, top: doc.y }];
    let explicit = false;
    const usable = doc.page.height - doc.page.margins.bottom - MARGIN;
    const close = () => { pages[pages.length - 1].end = doc.y; };
    // Something drawn on this page since its header? A ---page--- on a page that is still
    // empty (one just started), or at the very end, would only leave a blank page.
    let drawn = false;
    const breakPage = () => { if (!drawn) return; close(); explicit = true; doc.addPage(); };
    doc.on("pageAdded", () => {
      pages[pages.length - 1].end ??= doc.page.height - doc.page.margins.bottom;
      header(96);
      pages.push({ auto: !explicit, top: doc.y });
      explicit = false;
      drawn = false;
    });
    let spills = 0;
    // Where to lay the signature: drawn last, on top of the text, so it takes no room.
    const marks = [];
    let signed = 0;

    const room = () => doc.page.height - doc.page.margins.bottom - doc.y;
    const lastContent = blocks.findLastIndex((b) => b.type !== "page");
    for (const [n, block] of blocks.entries()) {
      if (block.type === "page") { if (n < lastContent) breakPage(); continue; }
      if (block.type === "signature") {
        if (sigImage) marks.push({ page: pages.length - 1, x: left + signature.x * width, y: doc.y + signature.dy });
        continue;
      }
      drawn = true;
      // Headings keep company with what follows them.
      if ((block.type === "h1" || block.type === "h2") && room() < 110) doc.addPage();
      if (block.type === "table") { drawTable(doc, block.rows); drawn = true; continue; }
      doc.x = left;
      if (block.type === "h1") {
        down(doc, 0.3);
        writeRuns(doc, block.runs.map((r) => ({ ...r, bold: true })), { width, align: "center", size: 14, color: GOLD });
        down(doc, 0.6);
      } else if (block.type === "h2") {
        down(doc, 0.4);
        writeRuns(doc, block.runs.map((r) => ({ ...r, bold: true })), { width, size: SIZE + 0.5, color: GOLD });
        down(doc, 0.35);
      } else if (block.type === "center") {
        writeRuns(doc, block.runs, { width, align: "center" });
        down(doc, 0.5);
      } else if (block.type === "bullet") {
        const y = doc.y;
        doc.font(font(false)).fontSize(SIZE).fillColor(INK).text("•", left + 4, y);
        writeRuns(doc, block.runs, { x: left + 18, y, width: width - 18 });
        down(doc, 0.4);
      } else {
        writeRuns(doc, block.runs, { width });
        down(doc, 0.7);
      }
      drawn = true;
    }

    close();
    spills = pages.filter((p) => p.auto && p.end - p.top < usable * 0.2).length;

    const range = doc.bufferedPageRange();
    for (const mark of marks) {
      doc.switchToPage(range.start + mark.page);
      try {
        doc.image(sigImage, mark.x, Math.max(MARGIN - 20, mark.y), { width: signature.width });
        signed += 1;
      } catch (error) {
        console.error(`letter signature: image couldn't be drawn (${error?.message || error})`);
      }
    }

    // Footers on every page.
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      // The footer sits inside the bottom margin; without this pdfkit adds a blank page per footer.
      doc.page.margins.bottom = 0;
      const y = doc.page.height - MARGIN + 2;
      // Footer as in HOR's Word letters: a rule, then name (bold), SEC number and website, centred.
      doc.moveTo(left, y - 8).lineTo(left + width, y - 8).lineWidth(0.5).strokeColor("#8A8073").stroke();
      const line = (text, at, bold) => doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 7.5 : 6.5).fillColor(INK)
        .text(text, left, at, { width, align: "center", lineBreak: false });
      line(LEGAL.org.toUpperCase().replace(" INC.", ", INC."), y, true);
      line(`SEC Registration: ${LEGAL.sec}`, y + 9.5);
      line(`https://${LEGAL.website}/`, y + 17.5);
    }
    doc.end();
    }
  });
}
