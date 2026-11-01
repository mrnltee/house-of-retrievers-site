/**
 * Event letters (owner, 2026-11-01): letters made for one event fill these
 * blanks from the event itself; sends from its Brand tracker do too. Pure
 * functions, so they can be tested.
 */
import { supportsLine } from "./eventBeneficiaries.mjs";

export const EVENT_FILLS = {
  "Event Name": "The event's title",
  "Event Short Name": "The title before “:” or a dash, e.g. Golden Beginning",
  "Event Date": "e.g. Monday, November 30, 2026",
  "Event Time": "e.g. 2:30 – 6:00 PM, or All day",
  "Event Venue": "The venue name",
  "Event Address": "The venue's street and area",
  "Event Location": "Venue and city, e.g. Novotel Manila Araneta City, Quezon City",
  "Event Link": "The event's page on the website",
  "Event Partners": "Brands that said Yes as partners (Brand tracker), e.g. A, B and C",
  "Event Sponsors": "Brands that said Yes as sponsors (Brand tracker)",
  "Event Beneficiaries": "The beneficiaries the event picked",
  "Event Price": "The event's cost line",
};
export const EVENT_BLANKS = Object.keys(EVENT_FILLS);

const clock = (t) => {
  const m = String(t || "").match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  return { text: `${h % 12 || 12}:${m[2]}`, half: h < 12 ? "AM" : "PM" };
};

function timeLine(event) {
  if (event.all_day) return "All day";
  const a = clock(event.start_time);
  const b = clock(event.end_time);
  if (!a) return "";
  if (!b) return `${a.text} ${a.half}`;
  return a.half === b.half ? `${a.text} – ${b.text} ${b.half}` : `${a.text} ${a.half} – ${b.text} ${b.half}`;
}

function dateLine(value) {
  const iso = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** An event row (+ its Yes brands, beneficiaries and page link) → { "Event Name": …, … }. */
export function eventBlankValues(event, { partners = [], sponsors = [], beneficiaries = [], link = "" } = {}) {
  if (!event) return {};
  const name = String(event.title || "").trim();
  const t = (v) => String(v || "").trim();
  return {
    "Event Name": name,
    "Event Short Name": name.split(/\s*[:–—-]\s+/)[0].trim() || name,
    "Event Date": dateLine(event.date),
    "Event Time": timeLine(event),
    "Event Venue": t(event.venue),
    "Event Address": t(event.venue_address),
    "Event Location": [t(event.venue), t(event.city)].filter(Boolean).join(", "),
    "Event Link": t(link),
    "Event Partners": supportsLine(partners),
    "Event Sponsors": supportsLine(sponsors),
    "Event Beneficiaries": supportsLine(beneficiaries),
    "Event Price": t(event.cost),
  };
}

const slug = (text) => String(text || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 45) || "letter";

/** A letter made for an event: ev-<name>-xxxx (fits the letter key rule). */
export const eventLetterKey = (name) => `ev-${slug(name)}-${Math.random().toString(36).slice(2, 6).padEnd(4, "0")}`;
