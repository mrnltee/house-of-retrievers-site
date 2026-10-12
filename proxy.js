import { NextResponse } from "next/server";
import { routePageRequest } from "./app/lib/hostRouting.mjs";

/**
 * Serve events.houseofretrieversph.org from `/events` and
 * admin.houseofretrieversph.org from `/admin`. The retired countdown host
 * redirects to the main site until its Vercel domain is removed.
 */
export function proxy(request) {
  const { pathname, search } = request.nextUrl;
  const host = request.headers.get("host");
  const decision = routePageRequest(host, pathname, search);

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
