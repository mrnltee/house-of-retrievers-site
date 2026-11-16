/**
 * The media hub's audience block in Partnerships: HoR's own channel numbers ("Our community")
 * and the founding families ("Meet the pack"). Edited in Admin → Media hub. Pure, so it is tested.
 *
 * Numbers are always shown with their "as of" date, and the channels are never added together:
 * many people follow more than one channel, so a total would overstate the audience.
 * A family's rate card (numbers, rates, collaboration contact) is theirs: it shows only once HoR has
 * the family's OK (`statsOn`, kept as the key for content saved before rates existed).
 */
import { families } from "../content/families.js";

/** @typedef {{name: string, handle: string, url: string, followers: string, posts: string, live?: boolean, asOf?: string}} Channel */

/** @type {{asOf: string, channels: Channel[]}} */
export const DEFAULT_COMMUNITY = {
  asOf: "16 November 2026",
  channels: [
    { name: "Instagram", handle: "@houseofretrieversph", url: "https://www.instagram.com/houseofretrieversph/", followers: "1,408", posts: "280" },
    { name: "Facebook", handle: "House of Retrievers PH", url: "https://www.facebook.com/houseofretrieversph", followers: "2.5K", posts: "" },
  ],
};

export const MAX_CHANNELS = 4;
export const MAX_RATES = 6;

/** The founding families with a profile (placeholder cards are left out). Names and photos stay in app/content/families.js. */
export const PACK_FAMILIES = families.filter((family) => family.socialUrl && family.frontImage).map((family) => ({
  handle: family.note,
  group: family.group,
  names: family.names,
  url: family.socialUrl,
  photo: family.frontImage,
}));

/**
 * Per-family settings, keyed by handle. Counts are prefilled from the profiles as seen on 16 Nov 2026,
 * and switched on for all five families, counts only, no rates (owner, 16 Nov 2026). A family that withdraws is switched off here or in the admin.
 * @type {{handle: string, show: boolean, statsOn: boolean, followers: string, posts: string, asOf: string, rates: {label: string, amount: string}[], contact: string}[]}
 */
export const DEFAULT_PACK = [
  { handle: "@thegolden.nuggets", show: true, statsOn: true, followers: "1,778", posts: "965", asOf: "16 November 2026", rates: [], contact: "" },
  { handle: "@dailydoseofmacchiato_", show: true, statsOn: true, followers: "1,456", posts: "223", asOf: "16 November 2026", rates: [], contact: "" },
  { handle: "@itsmefayethepancakee", show: true, statsOn: true, followers: "2,103", posts: "535", asOf: "16 November 2026", rates: [], contact: "" },
  { handle: "@lukaxluji_goldenbros", show: true, statsOn: true, followers: "1,025", posts: "117", asOf: "16 November 2026", rates: [], contact: "" },
  { handle: "@molly.maverickthebears", show: true, statsOn: true, followers: "1,368", posts: "1,102", asOf: "16 November 2026", rates: [], contact: "" },
];

function text(value, max) {
  return String(value ?? "").replace(/<[^>]*>/g, "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}

/** A count as people write it: 1,408 · 2.5K · 165k · 1.2M. Anything else is dropped. */
export function cleanCount(value) {
  const count = text(value, 12);
  return /^\d[\d,]*(\.\d+)?[KkMm]?$/.test(count) ? count : "";
}

function cleanUrl(value) {
  const url = text(value, 200);
  try {
    return new URL(url).protocol === "https:" ? url : "";
  } catch {
    return "";
  }
}

function parse(value) {
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return null; }
}

/** HoR's channels from the editor: named rows with a count, https links only. */
export function cleanCommunity(value) {
  const raw = parse(value);
  if (!raw || typeof raw !== "object") return { asOf: "", channels: [] };
  const channels = (Array.isArray(raw.channels) ? raw.channels : []).map((row) => ({
    name: text(row?.name, 30),
    handle: text(row?.handle, 60),
    url: cleanUrl(row?.url),
    followers: cleanCount(row?.followers),
    posts: cleanCount(row?.posts),
  })).filter((row) => row.name && row.followers).slice(0, MAX_CHANNELS);
  return { asOf: text(raw.asOf, 40), channels };
}

/** Rate lines: what is offered and its price as the family writes it (₱5,000, From ₱3,500, On request). */
export function cleanRates(value) {
  return (Array.isArray(value) ? value : []).map((row) => ({ label: text(row?.label, 40), amount: text(row?.amount, 24) }))
    .filter((row) => row.label && row.amount).slice(0, MAX_RATES);
}

/** A collaboration contact: an email address or an https link. Anything else is dropped. */
export function cleanContact(value) {
  const contact = text(value, 120);
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) return contact;
  return cleanUrl(contact);
}

/** Family settings from the editor, only for families that exist; counts only when they are counts. */
export function cleanPack(value) {
  const raw = parse(value);
  const known = new Set(PACK_FAMILIES.map((family) => family.handle));
  return (Array.isArray(raw) ? raw : []).filter((row) => known.has(row?.handle)).map((row) => ({
    handle: row.handle,
    show: row.show !== false,
    statsOn: row.statsOn === true,
    followers: cleanCount(row.followers),
    posts: cleanCount(row.posts),
    asOf: text(row.asOf, 40),
    rates: cleanRates(row.rates),
    contact: cleanContact(row.contact),
  }));
}

/**
 * What the public page shows. Saved settings win; content saved before this existed uses the defaults.
 * A family's rate card appears only when switched on, dated, and with a follower count or a rate.
 */
export function reachFrom(content = {}) {
  const saved = content?.community ? cleanCommunity(content.community) : null;
  const community = saved && saved.channels.length ? saved : DEFAULT_COMMUNITY;
  const settings = Array.isArray(content?.pack) ? cleanPack(content.pack) : DEFAULT_PACK;
  const pack = PACK_FAMILIES.map((family) => {
    const setting = settings.find((row) => row.handle === family.handle) || { show: true, statsOn: false };
    const rates = cleanRates(setting.rates);
    const stats = setting.statsOn && setting.asOf && (setting.followers || rates.length)
      ? { followers: setting.followers || "", posts: setting.posts || "", asOf: setting.asOf, rates, contact: cleanContact(setting.contact) }
      : null;
    return setting.show === false ? null : { ...family, stats };
  }).filter(Boolean);
  return { community, pack };
}

/** A date as the hub writes it, in Manila: "16 November 2026". */
export function manilaDate(date = new Date()) {
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Manila" });
}

/** 1408 → "1,408". */
export function formatCount(value) {
  return Number.isFinite(value) ? Math.round(value).toLocaleString("en-US") : "";
}

/**
 * Puts HoR's live Instagram counts (app/lib/instagramCounts.js) on its Instagram channel, matched by the
 * username in its link or handle, dated today. Other channels keep the counts and date typed in the admin.
 * No live counts, or no matching channel: the community is returned as it was.
 */
export function withLiveInstagram(community, live, now = new Date()) {
  if (!live?.username || !Number.isFinite(live.followers) || !community?.channels?.length) return community;
  const name = live.username.toLowerCase();
  let matched = false;
  const channels = community.channels.map((channel) => {
    const where = `${channel.url} ${channel.handle}`.toLowerCase();
    const isInstagram = where.includes("instagram") || /^instagram$/i.test(channel.name);
    if (matched || !isInstagram || !where.includes(name)) return channel;
    matched = true;
    return { ...channel, followers: formatCount(live.followers), posts: live.posts == null ? channel.posts : formatCount(live.posts), live: true, asOf: manilaDate(now) };
  });
  return matched ? { ...community, channels } : community;
}

/**
 * One line for the fact sheet, never a total. One date at the end when every channel shares it:
 * "Instagram 1,408 followers · Facebook 2.5K followers (as of 16 November 2026)"; else a date per channel.
 */
export function communityLine(community) {
  if (!community?.channels?.length) return "";
  const dated = community.channels.map((channel) => ({ ...channel, asOf: channel.asOf || community.asOf || "" }));
  const dates = new Set(dated.map((channel) => channel.asOf));
  if (dates.size <= 1) {
    const list = dated.map((channel) => `${channel.name} ${channel.followers} followers`).join(" · ");
    const [only] = dates;
    return only ? `${list} (as of ${only})` : list;
  }
  return dated.map((channel) => `${channel.name} ${channel.followers} followers${channel.asOf ? ` (as of ${channel.asOf})` : ""}`).join(" · ");
}

export const STALE_AFTER_DAYS = 31;

/** Whole calendar days in Manila between a date written like "16 November 2026" and today; null when unreadable. */
export function daysSince(asOf, now = new Date()) {
  const when = Date.parse(`${asOf} 00:00 UTC`);
  const today = Date.parse(`${manilaDate(now)} 00:00 UTC`);
  return Number.isFinite(when) && Number.isFinite(today) ? Math.round((today - when) / 86400000) : null;
}

/**
 * The monthly reminder: typed counts whose date is over a month old (or missing), for the admin.
 * Live channels (pass `instagram` from loadInstagramCounts) are never stale; families switched off are left out.
 * @returns {{what: string, asOf: string, days: number|null}[]}
 */
export function staleCounts(content = {}, { now = new Date(), instagram = null } = {}) {
  const reach = reachFrom(content);
  const community = withLiveInstagram(reach.community, instagram, now);
  const { pack } = reach;
  const settings = Array.isArray(content?.pack) ? cleanPack(content.pack) : DEFAULT_PACK;
  const old = (asOf) => { const days = daysSince(asOf, now); return days == null || days > STALE_AFTER_DAYS ? days : false; };
  const rows = [];
  for (const channel of community.channels) {
    if (channel.live) continue;
    const days = old(channel.asOf || community.asOf);
    if (days !== false) rows.push({ what: `${channel.name} (HoR)`, asOf: channel.asOf || community.asOf || "", days });
  }
  for (const family of pack) {
    const setting = settings.find((row) => row.handle === family.handle);
    if (!setting?.statsOn) continue;
    const days = old(setting.asOf);
    if (days !== false) rows.push({ what: `${family.names} (${family.handle})`, asOf: setting.asOf, days });
  }
  return rows;
}
