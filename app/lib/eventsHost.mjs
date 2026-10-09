/**
 * Host routing for the events subdomain.
 *
 * events.houseofretrieversph.org is served by this same Next.js project.
 * Middleware rewrites every page request on that host to the `/events`
 * routes, so `events.…/` renders `app/events/page.jsx` and the visitor's
 * address bar keeps the subdomain.
 *
 * Only one public address may exist for each events page:
 * - `events.…/events/x` redirects to `events.…/x`
 * - `www.…/events/x` (and the apex) redirects to `events.…/x`
 *
 * Preview deployments (*.vercel.app) and localhost are left alone, so
 * `/events` can be reviewed there before the subdomain is live. Locally,
 * `http://events.localhost:3000` behaves like the real subdomain.
 */

export const EVENTS_HOST = "events.houseofretrieversph.org";
export const EVENTS_URL = `https://${EVENTS_HOST}`;
export const MAIN_HOSTS = ["houseofretrieversph.org", "www.houseofretrieversph.org"];

const LOCAL_EVENTS_HOSTS = ["events.localhost"];
const EVENTS_PREFIX = "/events";

/** Lower-case the host and drop any port. */
export function normalizeHost(host = "") {
  return String(host).split(":")[0].trim().toLowerCase();
}

export function isEventsHost(host) {
  const name = normalizeHost(host);
  return name === EVENTS_HOST || LOCAL_EVENTS_HOSTS.includes(name);
}

function isUnderEvents(pathname) {
  return pathname === EVENTS_PREFIX || pathname.startsWith(`${EVENTS_PREFIX}/`);
}

function stripEventsPrefix(pathname) {
  return pathname.slice(EVENTS_PREFIX.length) || "/";
}

/**
 * Decide what middleware should do with a page request.
 *
 * @param {string} host      The request's Host header.
 * @param {string} pathname  The request path, e.g. "/" or "/events/run".
 * @param {string} [search]  The query string including "?", or "".
 * @returns {{type: "rewrite", pathname: string}
 *         | {type: "redirect", url: string}
 *         | {type: "next"}}
 *   A redirect `url` starting with "/" is relative to the current host.
 */
export function routeEventsRequest(host, pathname, search = "") {
  if (isEventsHost(host)) {
    if (isUnderEvents(pathname)) {
      return { type: "redirect", url: `${stripEventsPrefix(pathname)}${search}` };
    }
    return { type: "rewrite", pathname: pathname === "/" ? EVENTS_PREFIX : `${EVENTS_PREFIX}${pathname}` };
  }

  if (isUnderEvents(pathname) && MAIN_HOSTS.includes(normalizeHost(host))) {
    return { type: "redirect", url: `${EVENTS_URL}${stripEventsPrefix(pathname)}${search}` };
  }

  return { type: "next" };
}
