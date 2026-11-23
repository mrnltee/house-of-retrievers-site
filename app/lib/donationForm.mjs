/**
 * Reads a returned Cash Donation Form (owner, 22 Nov 2026). HoR's donation letter attaches a fillable PDF
 * whose fields are named full_name, mobile, email, mailing_address, amount, payment_method, payment_date,
 * payment_reference, acknowledgment, display_name and signature_date. A donor fills it in a PDF viewer,
 * which saves their answers as an incremental update appended to the file, so the LAST definition of each
 * object is the one that counts (the template's first copy can even hold another donor's name).
 *
 * No dependencies: objects are read from the file, including compressed object streams. A file that can't
 * be read gives no fields, never an error: the admin types the details instead.
 */
import { inflateSync, inflateRawSync } from "node:zlib";

const MAX_INFLATE = 10 * 1024 * 1024;

/** The kind of file from its first bytes, never its name. */
export function sniffFile(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  const starts = (...sig) => sig.every((v, i) => b[i] === v);
  if (starts(0x25, 0x50, 0x44, 0x46, 0x2d)) return "application/pdf"; // %PDF-
  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (starts(0x52, 0x49, 0x46, 0x46) && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return null;
}

const latin1 = (bytes) => Buffer.from(bytes).toString("latin1");

function inflate(buf) {
  try { return inflateSync(buf, { maxOutputLength: MAX_INFLATE }); } catch { /* try raw */ }
  try { return inflateRawSync(buf, { maxOutputLength: MAX_INFLATE }); } catch { return null; }
}

/** The bytes between `stream` and `endstream` of one object's text (latin1). */
function streamOf(body) {
  const start = body.search(/stream\r?\n/);
  if (start < 0) return null;
  const from = body.indexOf("\n", start) + 1;
  const end = body.lastIndexOf("endstream");
  if (end < from) return null;
  let raw = body.slice(from, end);
  raw = raw.replace(/\r?\n$/, "");
  return Buffer.from(raw, "latin1");
}

/** Every object, by number; later definitions (incremental updates) replace earlier ones. */
export function pdfObjects(bytes) {
  const text = latin1(bytes);
  const objects = new Map();
  const re = /(\d+)\s+(\d+)\s+obj\b([\s\S]*?)\bendobj/g;
  let m;
  while ((m = re.exec(text))) {
    const [, num, , body] = m;
    objects.set(num, body);
    // A compressed object stream holds more objects; they take effect where the stream appears.
    if (/\/Type\s*\/ObjStm\b/.test(body) && /\/FlateDecode\b/.test(body)) {
      const first = Number(body.match(/\/First\s+(\d+)/)?.[1]);
      const count = Number(body.match(/\/N\s+(\d+)/)?.[1]);
      const data = streamOf(body);
      const out = data && inflate(data);
      if (!out || !Number.isFinite(first) || !Number.isFinite(count)) continue;
      const s = out.toString("latin1");
      const head = s.slice(0, first).trim().split(/\s+/).map(Number);
      for (let i = 0; i < count && i * 2 + 1 < head.length; i++) {
        const at = first + head[i * 2 + 1];
        const next = i + 1 < count && (i + 1) * 2 + 1 < head.length ? first + head[(i + 1) * 2 + 1] : s.length;
        objects.set(String(head[i * 2]), s.slice(at, next));
      }
    }
  }
  return objects;
}

/** A PDF literal string's contents, from just after "(" — returns [value, index after ")"]. */
function readLiteral(s, i) {
  let out = "";
  let depth = 1;
  for (; i < s.length; i++) {
    const c = s[i];
    if (c === "\\") {
      const n = s[++i];
      const esc = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", "(": "(", ")": ")", "\\": "\\" };
      if (n in esc) out += esc[n];
      else if (/[0-7]/.test(n)) {
        let oct = n;
        while (oct.length < 3 && /[0-7]/.test(s[i + 1])) oct += s[++i];
        out += String.fromCharCode(parseInt(oct, 8) & 0xff);
      } else if (n === "\r") { if (s[i + 1] === "\n") i++; } else if (n !== "\n") out += n;
    } else if (c === "(") { depth++; out += c; } else if (c === ")") {
      if (--depth === 0) return [out, i + 1];
      out += c;
    } else out += c;
  }
  return [out, i];
}

/** Bytes (as a latin1 string) to text: UTF-16BE when it starts with the byte-order mark. */
function textOf(raw) {
  if (raw.charCodeAt(0) === 0xfe && raw.charCodeAt(1) === 0xff) {
    let s = "";
    for (let i = 2; i + 1 < raw.length; i += 2) s += String.fromCharCode((raw.charCodeAt(i) << 8) | raw.charCodeAt(i + 1));
    return s;
  }
  return Buffer.from(raw, "latin1").toString("latin1");
}

/** The value after a key in an object's text: a string, a /Name, or an indirect reference. */
function valueAfter(body, key, objects, depth = 0) {
  const at = body.search(new RegExp(`/${key}(?![A-Za-z0-9])`));
  if (at < 0) return null;
  let i = at + key.length + 1;
  while (/\s/.test(body[i])) i++;
  const c = body[i];
  if (c === "(") return textOf(readLiteral(body, i + 1)[0]);
  if (c === "<" && body[i + 1] !== "<") {
    const hex = body.slice(i + 1, body.indexOf(">", i)).replace(/\s+/g, "");
    const raw = (hex.length % 2 ? `${hex}0` : hex).match(/../g)?.map((h) => String.fromCharCode(parseInt(h, 16))).join("") || "";
    return textOf(raw);
  }
  if (c === "/") return body.slice(i + 1).match(/^[^\s/<>[\]()]+/)?.[0]?.replace(/#([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))) ?? "";
  const ref = body.slice(i).match(/^(\d+)\s+\d+\s+R/);
  if (ref && depth < 2) {
    const target = objects.get(ref[1]) || "";
    const trimmed = target.trim();
    if (trimmed.startsWith("(")) return textOf(readLiteral(trimmed, 1)[0]);
    if (trimmed.startsWith("/")) return trimmed.slice(1).match(/^[^\s/<>[\]()]+/)?.[0] ?? "";
    return null;
  }
  return null;
}

/** Every form field's name and value: { full_name: "Jerome G. Frontuna", payment_method: "BankTransfer", … }. */
export function pdfFormFields(bytes) {
  const objects = pdfObjects(bytes);
  const fields = {};
  for (const body of objects.values()) {
    if (!/\/T\s*[(<]/.test(body)) continue;
    const name = valueAfter(body, "T", objects);
    if (!name) continue;
    const value = valueAfter(body, "V", objects);
    if (value != null) fields[name] = value;
    else if (!(name in fields)) fields[name] = "";
  }
  return fields;
}

const clean = (v, max = 300) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** "11/19/2026", "2026-11-19" or "November 19, 2026" to 2026-11-19 (the form writes month first). */
export function formDate(value) {
  const v = clean(value, 40);
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  let y; let mo; let d;
  if (m) [, y, mo, d] = m.map(Number);
  else if ((m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/))) [, mo, d, y] = m.map(Number);
  else {
    const t = Date.parse(`${v} 12:00 UTC`);
    if (!v || Number.isNaN(t)) return "";
    const date = new Date(t);
    [y, mo, d] = [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()];
  }
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return "";
  const check = new Date(Date.UTC(y, mo - 1, d));
  if (check.getUTCMonth() !== mo - 1) return "";
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** "500.00", "₱5,000" to "500" / "5000"; amounts with centavos are kept as typed so the form asks. */
export function formAmount(value) {
  const v = clean(value, 30).replace(/[₱,\s]|PHP|Php/g, "");
  if (!v) return "";
  const m = v.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!m) return v;
  return !m[2] || /^0+$/.test(m[2]) ? String(Number(m[1])) : v;
}

const METHOD_KEYS = { banktransfer: "bank", bank: "bank", gcash: "gcash", cheque: "cheque", check: "cheque", cash: "cash" };

/**
 * The donation details a returned form gives, ready to fill the donor's edit window. Returns
 * { found, donor: { receiptName, receiptAddress, amount, method, receivedOn, reference, acknowledge,
 * publicName }, contact: { mobile, email, signedOn } } — blank strings for anything not filled in.
 */
export function donationFromForm(bytes) {
  let fields = {};
  try {
    if (sniffFile(bytes) === "application/pdf") fields = pdfFormFields(bytes);
  } catch {
    fields = {};
  }
  const get = (key) => clean(fields[key]);
  const method = METHOD_KEYS[get("payment_method").toLowerCase().replace(/[^a-z]/g, "")] || "";
  const ack = get("acknowledgment").toLowerCase();
  const donor = {
    receiptName: get("full_name").slice(0, 160),
    receiptAddress: get("mailing_address").slice(0, 300),
    amount: formAmount(fields.amount),
    method,
    receivedOn: formDate(fields.payment_date),
    reference: get("payment_reference").slice(0, 120),
    acknowledge: ack.startsWith("public") ? "public" : ack.startsWith("private") ? "private" : "",
    publicName: get("display_name").slice(0, 160),
  };
  const contact = { mobile: get("mobile").slice(0, 40), email: get("email").slice(0, 200), signedOn: formDate(fields.signature_date) };
  const found = Object.values(donor).some(Boolean) || Object.values(contact).some(Boolean);
  return { found, donor, contact };
}
