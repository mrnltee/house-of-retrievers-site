/**
 * Splits text into plain pieces and links, so web addresses and emails typed
 * into an event's summary become clickable. Matches http(s):// links, bare
 * www. addresses and domains with a path (fb.me/x), and email addresses.
 * Trailing punctuation (".", ",", ")") stays outside the link.
 * @returns {Array<string | { href: string, text: string }>}
 */
const PATTERN = /\b(?:https?:\/\/[^\s<>"]+|www\.[^\s<>"]+|[a-z0-9.-]+\.(?:com|org|net|ph|io|co|me|gg|ly|app|page|link)(?:\/[^\s<>"]*)?|[\w.+-]+@[\w-]+(?:\.[\w-]+)+)/gi;
const TRAILING = /[.,;:!?)\]}'"’”]+$/;

export function linkify(text) {
  const value = String(text ?? "");
  const parts = [];
  let last = 0;
  for (const match of value.matchAll(PATTERN)) {
    let raw = match[0];
    const start = match.index;
    // Inside an email's domain? The email alternative will have caught it; skip partial hits.
    if (start > 0 && value[start - 1] === "@") continue;
    const trail = raw.match(TRAILING)?.[0] || "";
    // Keep a closing bracket that belongs to the link, e.g. ...wiki/Dog_(breed)
    if (trail.startsWith(")") && raw.includes("(")) raw = raw.slice(0, raw.length - trail.length + 1);
    else if (trail) raw = raw.slice(0, -trail.length);
    if (!raw) continue;
    const isEmail = /@/.test(raw) && !/^https?:/i.test(raw) && !raw.includes("/");
    const href = isEmail ? `mailto:${raw}` : /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    if (start > last) parts.push(value.slice(last, start));
    parts.push({ href, text: raw, email: isEmail });
    last = start + raw.length;
  }
  if (last < value.length) parts.push(value.slice(last));
  return parts;
}
