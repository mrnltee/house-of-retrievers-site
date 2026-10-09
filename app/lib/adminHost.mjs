/**
 * Host routing for the admin, which lives at admin.houseofretrieversph.org
 * and is served by this same project from the `/admin` routes, the same way
 * the events subdomain is (see eventsHost.mjs).
 *
 * - `admin.…/x` renders `/admin/x`; `admin.…/admin/x` redirects to `admin.…/x`.
 * - `/admin` on the main site or the events subdomain redirects to `admin.…`.
 * - Preview deployments and localhost are left alone, so `/admin` works there.
 *   `http://admin.localhost:3000` behaves like the real subdomain.
 */
import { EVENTS_HOST, MAIN_HOSTS, normalizeHost } from "./eventsHost.mjs";

export const ADMIN_HOST = "admin.houseofretrieversph.org";
export const ADMIN_URL = `https://${ADMIN_HOST}`;

const PREFIX = "/admin";

export function isAdminHost(host) {
  const name = normalizeHost(host);
  return name === ADMIN_HOST || name === "admin.localhost";
}

const isUnderAdmin = (pathname) => pathname === PREFIX || pathname.startsWith(`${PREFIX}/`);
const strip = (pathname) => pathname.slice(PREFIX.length) || "/";

/**
 * @returns {{type: "rewrite", pathname: string} | {type: "redirect", url: string} | {type: "next"}}
 */
export function routeAdminRequest(host, pathname, search = "") {
  if (isAdminHost(host)) {
    if (isUnderAdmin(pathname)) return { type: "redirect", url: `${strip(pathname)}${search}` };
    return { type: "rewrite", pathname: pathname === "/" ? PREFIX : `${PREFIX}${pathname}` };
  }
  const name = normalizeHost(host);
  if (isUnderAdmin(pathname) && (MAIN_HOSTS.includes(name) || name === EVENTS_HOST)) {
    return { type: "redirect", url: `${ADMIN_URL}${strip(pathname)}${search}` };
  }
  return { type: "next" };
}

/**
 * Path inside the admin, as the visitor's address bar should show it:
 * "/events" on the admin subdomain, "/admin/events" everywhere else.
 */
export function adminPath(host, path = "/") {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (isAdminHost(host)) return clean;
  return clean === "/" ? PREFIX : `${PREFIX}${clean}`;
}
