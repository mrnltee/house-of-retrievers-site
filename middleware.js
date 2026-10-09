import { NextResponse } from "next/server";
import { routeAdminRequest } from "./app/lib/adminHost.mjs";
import { routeEventsRequest } from "./app/lib/eventsHost.mjs";
import { PREVIEW_COOKIE, isCountdownHost, routeCountdownRequest } from "./app/lib/countdownHost.mjs";

/**
 * Serve events.houseofretrieversph.org from `/events` and
 * admin.houseofretrieversph.org from `/admin`, and (until launch) send the
 * main site to countdown.houseofretrieversph.org.
 * See app/lib/eventsHost.mjs and app/lib/adminHost.mjs.
 */
export function middleware(request) {
  const { pathname, search } = request.nextUrl;
  const host = request.headers.get("host");
  let decision = routeAdminRequest(host, pathname, search);
  if (decision.type === "next") decision = routeEventsRequest(host, pathname, search);
  if (decision.type === "next") {
    const previewKey = process.env.COUNTDOWN_PREVIEW_KEY || "";
    const preview = Boolean(previewKey) && request.cookies.get(PREVIEW_COOKIE)?.value === previewKey;
    decision = routeCountdownRequest({ host, pathname, search, preview, previewKey });
  }

  if (decision.type === "preview") {
    // Team preview of the main site while the countdown runs.
    const response = NextResponse.redirect(new URL(decision.url, request.url), 307);
    if (decision.value) {
      response.cookies.set(PREVIEW_COOKIE, process.env.COUNTDOWN_PREVIEW_KEY, { maxAge: 60 * 60 * 24 * 7, httpOnly: true, secure: true, sameSite: "lax", path: "/" });
    }
    else response.cookies.delete(PREVIEW_COOKIE);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }


  if (decision.type === "rewrite") {
    const url = request.nextUrl.clone();
    url.pathname = decision.pathname;
    return NextResponse.rewrite(url);
  }

  if (decision.type === "redirect") {
    // The countdown redirects are temporary: a 308 would be remembered by
    // browsers and keep sending people to the countdown after launch.
    const temporary = decision.url.startsWith("https://countdown.") || isCountdownHost(host);
    const response = NextResponse.redirect(new URL(decision.url, request.url), temporary ? 307 : 308);
    if (temporary) response.headers.set("Cache-Control", "no-store");
    return response;
  }

  return NextResponse.next();
}

// Pages only: API routes, Next.js internals and files with an extension
// (images, video, robots.txt, sitemap.xml) are served as they are on any host.
export const config = {
  matcher: ["/((?!api/|_next/|.*\\.[^/]+$).*)"],
};
