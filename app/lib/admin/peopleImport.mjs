/**
 * Importing the Join sheet (downloaded as CSV) into People. The sheet's
 * columns are Timestamp, Join type, Name, Email, Organization, Social
 * profile, Furbaby name, Message, Status, Notes; headers are matched by name,
 * so a reordered or renamed-but-recognisable sheet still imports.
 */
import { PEOPLE_STATUSES } from "./people.mjs";

/** RFC 4180 CSV → rows of cells. Handles quotes, doubled quotes and line breaks in cells. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const s = String(text || "").replace(/^﻿/, "");
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"' && s[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && s[i + 1] === "\n") i += 1;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const FIELDS = {
  createdAt: /^(timestamp|date|submitted|joined)/i,
  kind: /^(join ?type|type|kind|interest)/i,
  name: /^(full )?name$/i,
  email: /^e-?mail/i,
  organization: /^(organi[sz]ation|company)/i,
  socialProfile: /^(social|instagram|facebook|handle)/i,
  furbabyName: /^(furbaby|dog|pet)/i,
  message: /^message/i,
  status: /^status/i,
  notes: /^notes?$/i,
};
const KINDS = ["Member", "Volunteer", "Partner", "Sponsor"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "10/10/2026 21:19:05" (the sheet's format) or an ISO date → Date, read as Manila time. */
export function parseSheetDate(text) {
  const t = String(text || "").trim();
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    const [, mo, d, y, h = "0", mi = "0", se = "0"] = m;
    const iso = `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}T${h.padStart(2, "0")}:${mi}:${se.padStart(2, "0")}+08:00`;
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(t);
  return t && !Number.isNaN(date.getTime()) ? date : null;
}

/**
 * Sheet rows → people to import, plus the rows skipped and why.
 * @returns {{ people: object[], skipped: {row: number, reason: string}[], columns: string[] }}
 */
export function readSheet(text) {
  const rows = parseCsv(text);
  if (!rows.length) return { people: [], skipped: [], columns: [] };
  const header = rows[0].map((h) => h.trim());
  const index = {};
  for (const [field, pattern] of Object.entries(FIELDS)) {
    const i = header.findIndex((h) => pattern.test(h));
    if (i >= 0) index[field] = i;
  }
  const people = [];
  const skipped = [];
  const get = (row, field, max = 2000) => (index[field] === undefined ? "" : String(row[index[field]] ?? "").trim().slice(0, max));
  rows.slice(1).forEach((row, n) => {
    const line = n + 2;
    const email = get(row, "email", 200).toLowerCase();
    const kindRaw = get(row, "kind", 40);
    const kind = KINDS.find((k) => k.toLowerCase() === kindRaw.toLowerCase());
    const name = get(row, "name", 120);
    if (!EMAIL.test(email)) return skipped.push({ row: line, reason: "no valid email" });
    if (!kind) return skipped.push({ row: line, reason: `unknown join type "${kindRaw}"` });
    if (!name) return skipped.push({ row: line, reason: "no name" });
    const statusRaw = get(row, "status", 60);
    const status = PEOPLE_STATUSES[kind].find((s) => s.toLowerCase() === statusRaw.toLowerCase()) || "New";
    const notes = [get(row, "notes", 500), statusRaw && status === "New" && statusRaw.toLowerCase() !== "new" ? `Sheet status: ${statusRaw}` : ""].filter(Boolean).join(" · ");
    people.push({
      kind, name, email,
      organization: get(row, "organization", 160) || null,
      socialProfile: get(row, "socialProfile", 300) || null,
      furbabyName: get(row, "furbabyName", 120) || null,
      message: get(row, "message") || null,
      status,
      notes: notes || null,
      createdAt: parseSheetDate(get(row, "createdAt", 40)),
    });
  });
  return { people, skipped, columns: Object.keys(index) };
}
