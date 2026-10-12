/**
 * Compose the page-host rules used by middleware.
 *
 * Admin and events keep their existing routing order. The retired countdown
 * hostname stays as a permanent redirect until its Vercel domain is removed,
 * so old links never expose a duplicate copy of the main site.
 */
import { routeAdminRequest } from "./adminHost.mjs";
import { normalizeHost, routeEventsRequest } from "./eventsHost.mjs";
import { SITE_URL } from "./siteSeo.mjs";

const RETIRED_MAIN_HOSTS = ["countdown.houseofretrieversph.org", "countdown.localhost"];

/**
 * @returns {{type: "rewrite", pathname: string} | {type: "redirect", url: string} | {type: "next"}}
 */
export function routePageRequest(host, pathname, search = "") {
  let decision = routeAdminRequest(host, pathname, search);
  if (decision.type === "next") decision = routeEventsRequest(host, pathname, search);
  if (decision.type === "next" && RETIRED_MAIN_HOSTS.includes(normalizeHost(host))) {
    return { type: "redirect", url: `${SITE_URL}/` };
  }
  return decision;
}
