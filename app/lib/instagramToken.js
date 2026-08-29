import { get, put } from "@vercel/blob";

/**
 * Where the live Instagram token lives.
 *
 * Instagram long-lived tokens expire 60 days after they are issued, and a
 * running function cannot rewrite its own environment variables. So the
 * current token is kept in a private blob that both the feed route and the
 * refresh cron can reach, and INSTAGRAM_ACCESS_TOKEN becomes the seed used
 * only until the first refresh writes a blob.
 */
const TOKEN_PATHNAME = "instagram/access-token.json";

/** Refresh well before the 60-day expiry so a failed run has room to retry. */
export const REFRESH_AFTER_DAYS = 30;

const isPrivate = { access: "private" };

/**
 * @typedef {Object} StoredToken
 * @property {string} accessToken
 * @property {string} refreshedAt   ISO timestamp of the last successful refresh.
 * @property {number} expiresIn     Seconds the token was valid for when issued.
 */

/** @returns {Promise<StoredToken | null>} */
async function readStoredToken() {
  try {
    // A private blob cannot be fetched from its URL, and the CDN copy can lag
    // a rotation that just happened, so read through the SDK with cache off.
    const blob = await get(TOKEN_PATHNAME, { ...isPrivate, useCache: false });
    if (blob?.statusCode !== 200 || !blob.stream) return null;
    const parsed = await new Response(blob.stream).json();
    return typeof parsed?.accessToken === "string" ? parsed : null;
  } catch {
    // No blob yet, or the store is unreachable — fall back to the seed.
    return null;
  }
}

/** @returns {Promise<StoredToken>} */
export async function writeStoredToken(accessToken, expiresIn) {
  const record = {
    accessToken,
    refreshedAt: new Date().toISOString(),
    expiresIn: Number(expiresIn) || 0,
  };
  await put(TOKEN_PATHNAME, JSON.stringify(record), {
    ...isPrivate,
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return record;
}

/**
 * The token the feed should use right now: the refreshed one when it exists,
 * otherwise the seed from the environment.
 *
 * @returns {Promise<{ token: string | null, source: "blob" | "env" | "none", refreshedAt?: string }>}
 */
export async function getAccessToken() {
  const stored = await readStoredToken();
  if (stored?.accessToken) {
    return { token: stored.accessToken, source: "blob", refreshedAt: stored.refreshedAt };
  }

  const seed = process.env.INSTAGRAM_ACCESS_TOKEN;
  return seed ? { token: seed, source: "env" } : { token: null, source: "none" };
}

/** Days since the last refresh, or null when only the seed has ever been used. */
export async function daysSinceRefresh() {
  const stored = await readStoredToken();
  if (!stored?.refreshedAt) return null;
  return (Date.now() - Date.parse(stored.refreshedAt)) / 86_400_000;
}

/**
 * Trade the current token for a fresh 60-day one. Instagram requires the token
 * to be at least 24 hours old and not yet expired; there is no re-authentication.
 *
 * @returns {Promise<StoredToken>}
 */
export async function refreshAccessToken() {
  const { token } = await getAccessToken();
  if (!token) throw new Error("No Instagram token to refresh");

  const endpoint = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`;
  const response = await fetch(endpoint, { cache: "no-store" });
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.access_token) {
    const reason = payload?.error?.message || `HTTP ${response.status}`;
    throw new Error(`Instagram refused the refresh: ${reason}`);
  }

  return writeStoredToken(payload.access_token, payload.expires_in);
}
