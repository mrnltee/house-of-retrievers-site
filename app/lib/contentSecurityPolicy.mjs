/**
 * Content-Security-Policy: which places the browser may load scripts, images,
 * video, frames and connections from. Sent as Report-Only first (9 Nov 2026):
 * browsers block nothing, they only report what this policy would have blocked
 * to /api/csp-report, so it can be checked against real use before enforcing.
 *
 * What the site actually loads from elsewhere:
 * - Google Analytics (layout.jsx: googletagmanager.com, then google-analytics.com)
 * - Cloudinary: background videos and album photos (res.cloudinary.com), and
 *   admin album uploads straight from the browser (api.cloudinary.com)
 * - Instagram feed pictures (Instagram's CDN: cdninstagram.com / fbcdn.net)
 * - OpenStreetMap venue maps in a frame (openstreetmap.org)
 * - Our own hosts: email previews in the admin use absolute www addresses.
 *
 * Next.js writes small inline scripts and styles of its own, so
 * 'unsafe-inline' stays until the site moves to per-request nonces. The rest
 * (no plugins, no <base> tricks, forms only to us, no framing by others,
 * scripts only from us and Google Analytics) still closes real doors.
 */

const OWN = "https://*.houseofretrieversph.org https://houseofretrieversph.org";

export const CSP_DIRECTIVES = {
  "default-src": ["'self'"],
  "script-src": ["'self'", "'unsafe-inline'", "https://www.googletagmanager.com"],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "data:", "blob:", OWN, "https://res.cloudinary.com", "https://*.cdninstagram.com", "https://*.fbcdn.net", "https://www.googletagmanager.com", "https://*.google-analytics.com"],
  "media-src": ["'self'", "blob:", "https://res.cloudinary.com"],
  "font-src": ["'self'", "data:"],
  "connect-src": ["'self'", "https://api.cloudinary.com", "https://www.googletagmanager.com", "https://*.google-analytics.com", "https://*.analytics.google.com"],
  "frame-src": ["'self'", "blob:", "https://www.openstreetmap.org"],
  "worker-src": ["'self'", "blob:"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "frame-ancestors": ["'self'"],
};

/** The header value. `dev` adds what `next dev` needs (eval for fast refresh, its websocket). */
export function contentSecurityPolicy({ dev = false, reportUri = "/api/csp-report" } = {}) {
  const directives = { ...CSP_DIRECTIVES };
  if (dev) {
    directives["script-src"] = [...directives["script-src"], "'unsafe-eval'"];
    directives["connect-src"] = [...directives["connect-src"], "ws:", "wss:"];
  }
  const parts = Object.entries(directives).map(([name, values]) => `${name} ${values.join(" ")}`);
  if (reportUri) parts.push(`report-uri ${reportUri}`);
  return parts.join("; ");
}

/** A report, cut down to what's useful in the logs (no query strings: they may hold pass codes). */
export function summarizeCspReport(body) {
  const report = body?.["csp-report"] || (Array.isArray(body) ? body[0]?.body : body?.body) || body || {};
  const strip = (value) => {
    const text = String(value || "").slice(0, 300);
    try {
      const url = new URL(text);
      return `${url.origin}${url.pathname}`;
    } catch {
      return text.split("?")[0];
    }
  };
  return {
    directive: String(report["effective-directive"] || report.effectiveDirective || report["violated-directive"] || report.violatedDirective || "").slice(0, 60),
    blocked: strip(report["blocked-uri"] || report.blockedURL),
    page: strip(report["document-uri"] || report.documentURL),
  };
}
