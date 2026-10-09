import { NextResponse } from "next/server";
import { routeAdminRequest } from "./app/lib/adminHost.mjs";
import { routeEventsRequest } from "./app/lib/eventsHost.mjs";

/**
 * Serve events.houseofretrieversph.org from `/events` and
 * admin.houseofretrieversph.org from `/admin`.
 * See app/lib/eventsHost.mjs and app/lib/adminHost.mjs.
 */
export function middleware(request) {
  const { pathname, search } = request.nextUrl;
  const host = request.headers.get("host");
  let decision = routeAdminRequest(host, pathname, search);
  if (decision.type === "next") decision = routeEventsRequest(host, pathname, search);

  if (decision.type === "rewrite") {
    const url = request.nextUrl.clone();
    url.pathname = decision.pathname;
    return NextResponse.rewrite(url);
  }

  if (decision.type === "redirect") {
    return NextResponse.redirect(new URL(decision.url, request.url), 308);
  }

  return NextResponse.next();
}

// Pages only: API routes, Next.js internals and files with an extension
// (images, video, robots.txt, sitemap.xml) are served as they are on any host.
export const config = {
  matcher: ["/((?!api/|_next/|.*\\.[^/]+$).*)"],
};
