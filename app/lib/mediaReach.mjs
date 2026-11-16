/**
 * The media hub's audience block in Partnerships: HoR's own channel numbers ("Our community")
 * and the founding families ("Meet the pack"). Edited in Admin → Media hub. Pure, so it is tested.
 *
 * Numbers are always shown with their "as of" date, and the channels are never added together:
 * many people follow more than one channel, so a total would overstate the audience.
 * A family's numbers are theirs: they show only once HoR has the family's OK (`statsOn`).
 */
import { families } from "../content/families.js";

/** @typedef {{name: string, handle: string, url: string, followers: string, posts: string}} Channel */

/** @type {{asOf: string, channels: Channel[]}} */
export const DEFAULT_COMMUNITY = {
  asOf: "16 November 2026",
  channels: [
    { name: "Instagram", handle: "@houseofretrieversph", url: "https://www.instagram.com/houseofretrieversph/", followers: "1,408", posts: "280" },
    { name: "Facebook", handle: "House of Retrievers PH", url: "https://www.facebook.com/houseofretrieversph", followers: "2.5K", posts: "" },
  ],
};

export const MAX_CHANNELS = 4;

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
 * but stay hidden (statsOn false) until the family agrees.
 * @type {{handle: string, show: boolean, statsOn: boolean, followers: string, posts: string, asOf: string}[]}
 */
export const DEFAULT_PACK = [
  { handle: "@thegolden.nuggets", show: true, statsOn: false, followers: "1,778", posts: "965", asOf: "16 November 2026" },
  { handle: "@dailydoseofmacchiato_", show: true, statsOn: false, followers: "1,456", posts: "223", asOf: "16 November 2026" },
  { handle: "@itsmefayethepancakee", show: true, statsOn: false, followers: "2,103", posts: "535", asOf: "16 November 2026" },
  { handle: "@lukaxluji_goldenbros", show: true, statsOn: false, followers: "1,025", posts: "117", asOf: "16 November 2026" },
  { handle: "@molly.maverickthebears", show: true, statsOn: false, followers: "1,368", posts: "1,102", asOf: "16 November 2026" },
];

function text(value, max) {
  return String(value ?? "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
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
  }));
}

/**
 * What the public page shows. Saved settings win; content saved before this existed uses the defaults.
 * A family's numbers appear only when switched on, with a follower count and a date.
 */
export function reachFrom(content = {}) {
  const saved = content?.community ? cleanCommunity(content.community) : null;
  const community = saved && saved.channels.length ? saved : DEFAULT_COMMUNITY;
  const settings = Array.isArray(content?.pack) ? cleanPack(content.pack) : DEFAULT_PACK;
  const pack = PACK_FAMILIES.map((family) => {
    const setting = settings.find((row) => row.handle === family.handle) || { show: true, statsOn: false };
    const stats = setting.statsOn && setting.followers && setting.asOf ? { followers: setting.followers, posts: setting.posts, asOf: setting.asOf } : null;
    return setting.show === false ? null : { ...family, stats };
  }).filter(Boolean);
  return { community, pack };
}

/** One line for the fact sheet: "Instagram 1,408 followers · Facebook 2.5K followers (as of 16 November 2026)". */
export function communityLine(community) {
  if (!community?.channels?.length) return "";
  const list = community.channels.map((channel) => `${channel.name} ${channel.followers} followers`).join(" · ");
  return community.asOf ? `${list} (as of ${community.asOf})` : list;
}
