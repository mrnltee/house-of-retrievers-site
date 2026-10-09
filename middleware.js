import { NextResponse } from "next/server";
import { routeEventsRequest } from "./app/lib/eventsHost.mjs";

/** Serve events.houseofretrieversph.org from the `/events` routes. See app/lib/eventsHost.mjs. */
export function middleware(request) {
  const { pathname, search } = request.nextUrl;
  const decision = routeEventsRequest(request.headers.get("host"), pathname, search);

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
