/**
 * Temporary countdown before the site opens.
 *
 * Until LAUNCH_AT, visitors to the main site (www and the apex) are sent to
 * countdown.houseofretrieversph.org, which renders `app/countdown/page.jsx`.
 * From LAUNCH_AT on, nothing is redirected any more and the countdown host
 * sends people to the main site, so the switch needs no deploy.
 *
 * - Redirects are 307 (temporary) so browsers don't remember them after launch.
 * - Events, admin, API routes and files are untouched.
 * - Only browsers holding the preview cookie see the main site early. Opening
 *   `www.…/?preview=<COUNTDOWN_PREVIEW_KEY>` sets it (one browser, one
 *   device); `?preview=0` clears it. Not by IP on purpose: every phone on the
 *   same Wi-Fi shares that address. Without the env var, nobody is exempt.
 * - Previews and localhost: `/countdown` is reachable directly and nothing
 *   is redirected. `http://countdown.localhost:3000` behaves like the real host.
 *
 * To remove it after launch: delete this file, `app/countdown/`, and the
 * call in middleware.js.
 */
import { MAIN_HOSTS, normalizeHost } from "./eventsHost.mjs";
import { SITE_URL } from "./siteSeo.mjs";

/** Saturday 10 October 2026, 5:00 PM Manila time. */
export const LAUNCH_AT = Date.parse("2026-10-10T17:00:00+08:00");
export const COUNTDOWN_HOST = "countdown.houseofretrieversph.org";
export const COUNTDOWN_URL = `https://${COUNTDOWN_HOST}`;
export const PREVIEW_COOKIE = "hor_preview";

const PREFIX = "/countdown";

export function isCountdownHost(host) {
  const name = normalizeHost(host);
  return name === COUNTDOWN_HOST || name === "countdown.localhost";
}

/**
 * @param {{host: string, pathname: string, search?: string, now?: number, preview?: boolean}} request
 * @returns {{type: "rewrite", pathname: string}
 *         | {type: "redirect", url: string}
 *         | {type: "next"}
 *         | {type: "preview", value: boolean, url: string}}
 */
export function routeCountdownRequest({ host, pathname, search = "", now = Date.now(), preview = false, previewKey = "" }) {
  const live = now >= LAUNCH_AT;

  if (isCountdownHost(host)) {
    if (live) return { type: "redirect", url: `${SITE_URL}/` };
    return { type: "rewrite", pathname: PREFIX };
  }

  if (!MAIN_HOSTS.includes(normalizeHost(host))) return { type: "next" };

  const params = new URLSearchParams(search);
  const given = params.get("preview");
  if (given !== null && !live) {
    params.delete("preview");
    const rest = params.toString();
    const url = `${pathname}${rest ? `?${rest}` : ""}`;
    if (given === "0") return { type: "preview", value: false, url };
    if (previewKey && given === previewKey) return { type: "preview", value: true, url };
  }

  if (live || preview) return { type: "next" };
  return { type: "redirect", url: `${COUNTDOWN_URL}/` };
}
