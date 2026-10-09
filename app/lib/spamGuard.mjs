/**
 * Spam checks for the join form (`app/api/join/route.js`).
 *
 * Three layers, none of which a real visitor notices:
 *
 * 1. Honeypot — the form carries a hidden "website" field that people never
 *    see or reach with the keyboard. Bots that fill every input fill it too.
 * 2. Fill time — the browser reports how long the form was open. Anything
 *    sent faster than a person can type is a script.
 * 3. Rate limit — at most a few submissions per visitor (IP) per window.
 *
 * Caught by 1 or 2, the route answers with the normal success response but
 * forwards nothing, so a bot has no signal to adapt to. Caught by 3, it gets
 * a plain 429, because a person who really did send many forms should know
 * to wait.
 *
 * The rate limit lives in memory, so it is per server instance: it slows a
 * burst, it is not a hard global cap. A Vercel Firewall rate-limit rule on
 * /api/join is the stronger backstop if abuse ever gets through.
 */

/** Hidden field name the form renders and the route checks. */
export const HONEYPOT_FIELD = "website";

/** Faster than this (ms between opening the form and sending it) is not a person. */
export const MIN_FILL_MS = 3000;

/** Submissions allowed per visitor per window. */
export const RATE_LIMIT = { limit: 5, windowMs: 10 * 60 * 1000 };

/** True when the hidden field came back with anything in it. */
export function isHoneypotTripped(value) {
  return typeof value === "string" && value.trim() !== "";
}

/**
 * Classify the reported fill time.
 * @returns {"ok" | "too-fast" | "missing"}
 */
export function checkFillTime(elapsedMs, minMs = MIN_FILL_MS) {
  const value = Number(elapsedMs);
  if (elapsedMs === undefined || elapsedMs === null || elapsedMs === "" || !Number.isFinite(value)) return "missing";
  if (value < minMs) return "too-fast";
  return "ok";
}

/** First address in x-forwarded-for, else x-real-ip, else "unknown". */
export function clientIp(headers) {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim() || "unknown";
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Fixed-window counter per key.
 * `hit(key, now)` records one attempt and says whether it is allowed.
 */
export function createRateLimiter({ limit, windowMs } = RATE_LIMIT) {
  const windows = new Map();

  function prune(now) {
    for (const [key, entry] of windows) {
      if (now - entry.start >= windowMs) windows.delete(key);
    }
  }

  return {
    hit(key, now = Date.now()) {
      if (windows.size > 5000) prune(now);
      let entry = windows.get(key);
      if (!entry || now - entry.start >= windowMs) {
        entry = { start: now, count: 0 };
        windows.set(key, entry);
      }
      entry.count += 1;
      if (entry.count > limit) {
        return { allowed: false, retryAfterSeconds: Math.ceil((entry.start + windowMs - now) / 1000) };
      }
      return { allowed: true, retryAfterSeconds: 0 };
    },
  };
}
