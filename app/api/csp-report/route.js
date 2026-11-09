import { summarizeCspReport } from "../../lib/contentSecurityPolicy.mjs";
import { clientIp, createRateLimiter } from "../../lib/spamGuard.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One page view can trip several rules; this only keeps the logs readable.
const limiter = createRateLimiter({ limit: 30, windowMs: 10 * 60 * 1000 });

/**
 * Browsers send Content-Security-Policy violation reports here (the policy is
 * Report-Only, see app/lib/contentSecurityPolicy.mjs). Each one becomes a
 * single short line in the Vercel logs; nothing is stored.
 */
export async function POST(request) {
  if (!limiter.hit(clientIp(request.headers)).allowed) return new Response(null, { status: 204 });
  const text = (await request.text().catch(() => "")).slice(0, 8000);
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 204 });
  }
  const { directive, blocked, page } = summarizeCspReport(body);
  if (directive || blocked) console.warn(`[csp-report] ${directive} blocked=${blocked} page=${page}`);
  return new Response(null, { status: 204 });
}
