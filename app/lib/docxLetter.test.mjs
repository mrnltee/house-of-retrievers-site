import { test } from "node:test";
import assert from "node:assert/strict";
import { crc32, deflateRawSync } from "node:zlib";
import { docxToLetter, docxXmlToLetter, unzipText } from "./docxLetter.mjs";
import { letterBlocks } from "./letters.mjs";

const W = (inner) => `<?xml version="1.0"?><w:document xmlns:w="x"><w:body>${inner}<w:sectPr/></w:body></w:document>`;
const P = (runs, pPr = "") => `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ""}${runs}</w:p>`;
const R = (text, bold = false) => `<w:r>${bold ? "<w:rPr><w:b/></w:rPr>" : ""}<w:t xml:space="preserve">${text}</w:t></w:r>`;

/** A minimal zip (deflated entries), as Word writes them. */
function zip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const raw = Buffer.from(text);
    const data = deflateRawSync(raw);
    const n = Buffer.from(name);
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0); head.writeUInt16LE(20, 4); head.writeUInt16LE(8, 8);
    head.writeUInt32LE(crc32(raw), 14); head.writeUInt32LE(data.length, 18); head.writeUInt32LE(raw.length, 22); head.writeUInt16LE(n.length, 26);
    locals.push(head, n, data);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 6); c.writeUInt16LE(8, 10);
    c.writeUInt32LE(crc32(raw), 16); c.writeUInt32LE(data.length, 20); c.writeUInt32LE(raw.length, 24); c.writeUInt16LE(n.length, 28); c.writeUInt32LE(offset, 42);
    centrals.push(c, n);
    offset += 30 + n.length + data.length;
  }
  const central = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(centrals.length / 2, 8); end.writeUInt16LE(centrals.length / 2, 10);
  end.writeUInt32LE(central.length, 12); end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...locals, central, end]));
}

test("a Word letter becomes letter markup: bold, headings, centred, tight lines, bullets, tables, page breaks", () => {
  const xml = W([
    P(R("Invitation"), '<w:pStyle w:val="Title"/>'),
    P(R("November 4, 2026"), '<w:pStyle w:val="NoSpacing"/>'),
    P(R("Sample Brand"), '<w:pStyle w:val="NoSpacing"/>'),
    P(""),
    P(R("Subject: ", true) + R("A golden beginning", true)),
    P(R("Dear team, we invite ") + R("Sample Brand", true) + R(" to join.")),
    P(R("Centred line"), '<w:jc w:val="center"/>'),
    P(R("First point"), '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>'),
    P(R("Second point"), '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>'),
    `<w:tbl><w:tr>${["Package", "Amount"].map((c) => `<w:tc>${P(R(c, true))}</w:tc>`).join("")}</w:tr><w:tr>${["Gold | tier", "₱10,000"].map((c) => `<w:tc>${P(R(c))}</w:tc>`).join("")}</w:tr></w:tbl>`,
    P('<w:r><w:br w:type="page"/></w:r>' + R("Page two")),
    P('<w:r><w:drawing>x</w:drawing></w:r>'),
  ].join(""));
  const out = docxXmlToLetter(xml);
  assert.equal(out.body, [
    "# Invitation",
    "November 4, 2026\nSample Brand",
    "**Subject: A golden beginning**",
    "Dear team, we invite **Sample Brand** to join.",
    "^ Centred line",
    "- First point\n- Second point",
    "|! Package | Amount |\n| Gold / tier | ₱10,000 |",
    "---page---",
    "Page two",
  ].join("\n\n"));
  assert.equal(out.subject, "A golden beginning");
  assert.equal(out.pictures, 1);
  assert.equal(out.cut, false);
  const types = letterBlocks(out.body).map((b) => b.type);
  assert.deepEqual(types, ["h1", "p", "p", "p", "center", "bullet", "bullet", "table", "page", "p"]);
});

test("Word entities, tabs, line breaks and turned-off bold", () => {
  const xml = W(P('<w:r><w:rPr><w:b w:val="0"/></w:rPr><w:t>A &amp; B</w:t><w:tab/><w:t>C</w:t><w:br/><w:t>D</w:t></w:r>'));
  assert.equal(docxXmlToLetter(xml).body, "A & B C\nD");
});

test("a .docx file is unzipped and read; other files get a plain message", async () => {
  const docx = zip({ "[Content_Types].xml": "<Types/>", "word/document.xml": W(P(R("Hello ") + R("there", true))), "word/header1.xml": "<w:hdr>Old header</w:hdr>" });
  assert.equal(await unzipText(docx, "word/header1.xml"), "<w:hdr>Old header</w:hdr>");
  const out = await docxToLetter(docx);
  assert.equal(out.body, "Hello **there**");
  assert.match((await docxToLetter(new Uint8Array([1, 2, 3]))).error, /couldn't be read/);
  assert.match((await docxToLetter(zip({ "a.txt": "x" }))).error, /isn't a Word \.docx/);
  assert.match((await docxToLetter(zip({ "word/document.xml": W(P("")) }))).error, /No text/);
});

test("with no Subject line, a short all-bold first line becomes the subject", () => {
  assert.equal(docxXmlToLetter(W(P(R("Sponsorship Opportunity | Paws & Poses", true)) + P(R("Dear team,")))).subject, "Sponsorship Opportunity | Paws & Poses");
  assert.equal(docxXmlToLetter(W(P(R("Dear team,")) + P(R("Bold later", true)))).subject, "");
});
