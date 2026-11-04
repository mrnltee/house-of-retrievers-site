/**
 * Word (.docx) → letter markup (owner, 2026-11-04): a new letter can start from a Word
 * file. Only the content comes across: paragraphs, bold, headings, centred lines,
 * bullets, tables and page breaks. The file's own header, footer and pictures are left
 * out (HOR's logo header and SEC footer are added to every letter PDF anyway).
 * Runs in the browser and in Node (DecompressionStream), with no extra packages.
 */
import { LETTER_LIMITS, TABLE_LIMITS } from "./letters.mjs";

const u16 = (b, i) => b[i] | (b[i + 1] << 8);
const u32 = (b, i) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;

/** One file out of a zip (a .docx is a zip), as text; null when it isn't there. */
export async function unzipText(bytes, name) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let end = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) if (u32(b, i) === 0x06054b50) { end = i; break; }
  if (end < 0) throw new Error("not a zip");
  let at = u32(b, end + 16);
  const count = u16(b, end + 10);
  const decoder = new TextDecoder();
  for (let n = 0; n < count && u32(b, at) === 0x02014b50; n++) {
    const method = u16(b, at + 10);
    const size = u32(b, at + 20);
    const nameLength = u16(b, at + 28);
    const skip = u16(b, at + 30) + u16(b, at + 32);
    const local = u32(b, at + 42);
    const entry = decoder.decode(b.subarray(at + 46, at + 46 + nameLength));
    at += 46 + nameLength + skip;
    if (entry !== name) continue;
    const start = local + 30 + u16(b, local + 26) + u16(b, local + 28);
    const data = b.subarray(start, start + size);
    if (method === 0) return decoder.decode(data);
    if (method !== 8) throw new Error("unsupported zip compression");
    const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return await new Response(stream).text();
  }
  return null;
}

const unxml = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, "&");
const attr = (xml, tag, name = "w:val") => xml.match(new RegExp(`<${tag}\\b[^>]*\\b${name}="([^"]*)"`))?.[1];
const on = (xml, tag) => { const m = xml.match(new RegExp(`<${tag}(\\s[^>]*)?/?>`)); return Boolean(m) && !/w:val="(0|false|off|none)"/.test(m[1] || ""); };

/** The end of the element that starts at `from` (same tag, nesting counted). */
function closeOf(xml, tag, from) {
  const re = new RegExp(`<${tag}\\b[^>]*?(/?)>|</${tag}>`, "g");
  re.lastIndex = from;
  let depth = 0;
  for (let m = re.exec(xml); m; m = re.exec(xml)) {
    if (m[0].startsWith("</")) { depth--; if (!depth) return m.index + m[0].length; }
    else if (!m[1]) depth++;
    else if (!depth) return m.index + m[0].length;
  }
  return xml.length;
}

/** A paragraph's text, with **bold** marked; page breaks noted. */
function paragraph(xml) {
  const pPr = xml.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)?.[0] || "";
  const style = attr(pPr, "w:pStyle") || "";
  const parts = [];
  let pageBreak = /<w:pageBreakBefore(\s[^>]*)?\/>/.test(pPr) && !/w:val="(0|false)"/.test(pPr.match(/<w:pageBreakBefore[^>]*>/)?.[0] || "");
  let pictures = 0;
  for (const run of xml.matchAll(/<w:r\b[^>]*>([\s\S]*?)<\/w:r>/g)) {
    const r = run[1];
    const rPr = r.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)?.[0] || "";
    const bold = on(rPr, "w:b");
    let text = "";
    for (const t of r.replace(/<w:rPr>[\s\S]*?<\/w:rPr>/, "").matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\b([^>]*)\/>|<w:cr\/>|<w:noBreakHyphen\/>|<w:drawing>|<w:pict>/g)) {
      if (t[1] != null) text += unxml(t[1]);
      else if (t[0] === "<w:tab/>") text += " ";
      else if (t[0] === "<w:noBreakHyphen/>") text += "-";
      else if (t[0] === "<w:drawing>" || t[0] === "<w:pict>") pictures++;
      else if (/w:type="page"/.test(t[2] || "")) pageBreak = true;
      else text += "\n";
    }
    if (text) parts.push({ text, bold });
  }
  // Join runs, marking bold stretches once (not word by word).
  let out = "";
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p.bold && p.text.trim()) {
      let text = p.text;
      while (parts[i + 1]?.bold) text += parts[++i].text;
      const lead = text.match(/^\s*/)[0];
      const tail = text.match(/\s*$/)[0];
      out += `${lead}**${text.trim().replace(/\*\*/g, "")}**${tail}`;
    } else out += p.text;
  }
  const level = /^(Title|Heading1)$/i.test(style) ? "h1" : /^(Subtitle|Heading[2-6])$/i.test(style) ? "h2" : "";
  return {
    text: out.replace(/[ \t]+\n/g, "\n").replace(/\n{2,}/g, "\n"),
    level,
    center: attr(pPr, "w:jc") === "center",
    bullet: /<w:numPr>/.test(pPr) || /^List/i.test(style),
    tight: /^NoSpacing$/i.test(style) || attr(pPr, "w:spacing", "w:after") === "0",
    pageBreak,
    pictures,
  };
}

const cellText = (xml) => [...xml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)].map((p) => paragraph(p[0]).text.trim()).filter(Boolean).join(" // ").replace(/\s*\|\s*/g, " / ").replace(/\n/g, " // ");

function table(xml) {
  const rows = [...xml.matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)].slice(0, TABLE_LIMITS.rows).map((tr, i) => {
    const cells = [...tr[0].matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g)].map((tc) => cellText(tc[0]) || " ");
    const header = /<w:tblHeader(\s[^>]*)?\/>/.test(tr[0]) || (i === 0 && cells.every((c) => /^\*\*[\s\S]*\*\*$/.test(c.trim()) || !c.trim()));
    return `${header ? "|!" : "|"} ${cells.map((c) => (header ? c.replace(/\*\*/g, "") : c)).join(" | ")} |`;
  });
  return rows.length ? rows.join("\n") : "";
}

/**
 * document.xml → { body, subject, pictures, cut }: the letter markup (blocks split by
 * blank lines), a subject when the letter has a "Subject:" or "Re:" line, how many
 * pictures were left out, and whether the text was cut to the letter size limit.
 */
export function docxXmlToLetter(xml) {
  const body = String(xml).match(/<w:body>([\s\S]*)<\/w:body>/)?.[1] || "";
  const blocks = [];
  let pictures = 0;
  let pending = null; // tight lines (No Spacing) kept together as one block
  const flush = () => { if (pending) { blocks.push(pending); pending = null; } };
  const re = /<w:tbl\b|<w:p\b/g;
  for (let m = re.exec(body); m; m = re.exec(body)) {
    const tag = m[0].slice(1);
    const end = closeOf(body, tag, m.index);
    const xmlPart = body.slice(m.index, end);
    re.lastIndex = end;
    if (tag === "w:tbl") { flush(); const t = table(xmlPart); if (t) blocks.push(t); continue; }
    const p = paragraph(xmlPart);
    pictures += p.pictures;
    if (p.pageBreak) { flush(); blocks.push("---page---"); }
    const text = p.text.trim();
    if (!text) { flush(); continue; }
    let line = text;
    if (p.level === "h1") line = `# ${text.replace(/\*\*/g, "").replace(/\n/g, " ")}`;
    else if (p.level === "h2") line = `## ${text.replace(/\*\*/g, "").replace(/\n/g, " ")}`;
    else if (p.bullet) line = `- ${text.replace(/\n/g, " ")}`;
    else if (p.center) line = text.split("\n").map((l) => `^ ${l}`).join("\n");
    const joinable = !p.level && (p.tight || p.bullet);
    if (joinable && pending && pending.startsWith("- ") === line.startsWith("- ") && pending.startsWith("^ ") === line.startsWith("^ ")) { pending += `\n${line}`; continue; }
    flush();
    if (joinable) pending = line;
    else blocks.push(line);
  }
  flush();
  while (blocks[blocks.length - 1] === "---page---") blocks.pop();
  let markup = blocks.join("\n\n");
  const cut = markup.length > LETTER_LIMITS.body;
  if (cut) markup = markup.slice(0, LETTER_LIMITS.body).replace(/\n[^\n]*$/, "");
  // A "Subject:" / "Re:" line, else a short all-bold first line (a title such as "Sponsorship Opportunity | …").
  const first = blocks[0] || "";
  const titleLine = /^\*\*[^*\n]+\*\*$/.test(first) && first.length <= LETTER_LIMITS.subject + 4 ? first : "";
  const subjectLine = (markup.match(/^(?:\*\*)?\s*(?:subject|re)\s*:\s*(.+?)(?:\*\*)?\s*$/im)?.[1] || titleLine).replace(/\*\*/g, "").replace(/^#+\s*/, "").trim();
  return { body: markup, subject: (subjectLine || "").slice(0, LETTER_LIMITS.subject), pictures, cut };
}

/** A .docx file's bytes → the same as docxXmlToLetter, or { error } in plain words. */
export async function docxToLetter(bytes) {
  let xml;
  try {
    xml = await unzipText(bytes, "word/document.xml");
  } catch {
    return { error: "That file couldn't be read. Save it from Word as a .docx file and try again." };
  }
  if (!xml) return { error: "That isn't a Word .docx file. Save it from Word as .docx and try again." };
  const letter = docxXmlToLetter(xml);
  if (!letter.body.trim()) return { error: "No text was found in that file." };
  return letter;
}
