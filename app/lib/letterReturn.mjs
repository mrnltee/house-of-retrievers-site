/**
 * Where a send from the send window returns to (owner, 2026-11-12): the admin
 * page it was opened over ("/registrations/<id>"), without an old ok/error
 * message. Only a same-site path: no scheme, no "//", no backslashes.
 */
export function safeReturn(path) {
  const raw = String(path || "");
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("://") || raw.includes("\\") || raw.length > 600) return "";
  const url = new URL(raw, "http://admin.local");
  if (url.origin !== "http://admin.local") return "";
  url.searchParams.delete("ok");
  url.searchParams.delete("error");
  return `${url.pathname}${url.search}`;
}
