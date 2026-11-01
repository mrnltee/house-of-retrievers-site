/**
 * Social links for brands and beneficiaries (owner, 2026-11-01): Facebook,
 * TikTok, X and Threads, next to the Instagram and website they already had.
 * Admins type a handle (@name) or paste a profile link; we keep a clean link.
 * Pure functions, so they can be tested.
 */
export const SOCIALS = [
  { key: "facebook", label: "Facebook", hosts: ["facebook.com", "fb.com"], url: (h) => `https://www.facebook.com/${h}` },
  { key: "tiktok", label: "TikTok", hosts: ["tiktok.com"], url: (h) => `https://www.tiktok.com/@${h}` },
  { key: "x", label: "X", hosts: ["x.com", "twitter.com"], url: (h) => `https://x.com/${h}` },
  { key: "threads", label: "Threads", hosts: ["threads.net", "threads.com"], url: (h) => `https://www.threads.net/@${h}` },
];

const HANDLE = /^[A-Za-z0-9._-]{1,60}$/;

/** One network's typed value → its link, null when blank, undefined when it can't be read. */
function cleanOne(social, value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const handle = text.replace(/^@/, "");
  if (HANDLE.test(handle) && !handle.includes(".com") && !handle.includes(".net")) return social.url(handle);
  let url;
  try { url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`); } catch { return undefined; }
  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.|web\.)/, "");
  if (!social.hosts.includes(host)) return undefined;
  // Facebook profile ids live in the query (profile.php?id=…); everything else is the first path part.
  if (social.key === "facebook" && url.pathname === "/profile.php" && /^\d+$/.test(url.searchParams.get("id") || "")) return `https://www.facebook.com/profile.php?id=${url.searchParams.get("id")}`;
  const first = url.pathname.split("/").filter(Boolean)[0]?.replace(/^@/, "") || "";
  return HANDLE.test(first) ? social.url(first) : undefined;
}

/** Form values → { values: { facebook, tiktok, x, threads } } or { error }. */
export function cleanSocials(input = {}) {
  const values = {};
  for (const social of SOCIALS) {
    const v = cleanOne(social, input[social.key]);
    if (v === undefined) return { error: `${social.label} should be a handle like @name, or the profile link.` };
    values[social.key] = v;
  }
  return { values };
}

/** Links to show, in a fixed order: Instagram, Facebook, TikTok, X, Threads, Website. */
export function socialLinks(item = {}) {
  return [
    ["instagram", "Instagram"],
    ...SOCIALS.map((s) => [s.key, s.label]),
    ["website", "Website"],
  ].filter(([key]) => item[key]).map(([key, label]) => ({ key, label, url: item[key] }));
}
