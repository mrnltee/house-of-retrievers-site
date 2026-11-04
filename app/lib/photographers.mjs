/**
 * Photographers (owner, 2026-11-04): who took an event's photos, credited on past
 * events under "Photos by", with their photo, a short bio, portfolio and socials.
 * Pure checks, so they can be tested; Facebook, TikTok, X and Threads use socials.mjs.
 */
export const PHOTOGRAPHER_LIMITS = { name: 80, bio: 300, website: 300, instagram: 300, notes: 2000 };

const HANDLE = /^[A-Za-z0-9._]{1,30}$/;

/** "@name", "name" or an instagram.com link → the profile link; null when blank; undefined when it can't be read. */
function instagramUrl(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const handle = text.replace(/^@/, "");
  if (HANDLE.test(handle)) return `https://www.instagram.com/${handle}`;
  let url;
  try { url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`); } catch { return undefined; }
  if (url.hostname.toLowerCase().replace(/^(www\.|m\.)/, "") !== "instagram.com") return undefined;
  const first = url.pathname.split("/").filter(Boolean)[0] || "";
  return HANDLE.test(first) ? `https://www.instagram.com/${first}` : undefined;
}

/** A portfolio address → an https link; null when blank; undefined when it isn't a web address. */
function webUrl(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(text) && !/^https?:\/\//i.test(text)) return undefined;
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    return url.hostname.includes(".") ? url.toString().replace(/\/$/, "") : undefined;
  } catch {
    return undefined;
  }
}

/** Form values → { photographer } or { error }. Showing on the site needs a bio. */
export function cleanPhotographer(input = {}) {
  const name = String(input.name ?? "").replace(/\s+/g, " ").trim();
  if (!name) return { error: "Give the photographer's name." };
  if (name.length > PHOTOGRAPHER_LIMITS.name) return { error: `The name is too long (${PHOTOGRAPHER_LIMITS.name} characters at most).` };
  const bio = String(input.bio ?? "").replace(/\r\n?/g, "\n").trim();
  if (bio.length > PHOTOGRAPHER_LIMITS.bio) return { error: `The bio is too long (${PHOTOGRAPHER_LIMITS.bio} characters at most).` };
  const website = webUrl(input.website);
  if (website === undefined) return { error: "The portfolio should be a web address, like juanshoots.com." };
  const instagram = instagramUrl(input.instagram);
  if (instagram === undefined) return { error: "Instagram should be a handle like @name, or the profile link." };
  const notes = String(input.notes ?? "").trim().slice(0, PHOTOGRAPHER_LIMITS.notes);
  const showOnSite = input.showOnSite === "on" || input.showOnSite === true;
  if (showOnSite && !bio) return { error: "Add a short bio before showing this photographer on the website." };
  return { photographer: { name, bio, website, instagram, notes, showOnSite } };
}
