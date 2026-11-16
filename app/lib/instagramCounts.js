/**
 * HoR's own Instagram follower and post counts, live from the Instagram API with the same token
 * as the feed (app/lib/instagramToken.js). Cached for an hour, like the feed. Returns null when there
 * is no token or Instagram does not answer, so the media hub falls back to the counts typed in the admin.
 * Only HoR's own account: other people's counts would need Business Discovery (a Facebook-linked login).
 */
import { getAccessToken } from "./instagramToken";

export async function loadInstagramCounts() {
  try {
    const { token } = await getAccessToken();
    if (!token) return null;
    const userId = process.env.INSTAGRAM_USER_ID || "17841440369853992";
    const apiVersion = process.env.INSTAGRAM_API_VERSION || "v26.0";
    const response = await fetch(`https://graph.instagram.com/${apiVersion}/${encodeURIComponent(userId)}?fields=username,followers_count,media_count`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 3600, tags: ["instagram"] },
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (!Number.isFinite(data?.followers_count)) return null;
    return { username: String(data.username || ""), followers: data.followers_count, posts: Number.isFinite(data.media_count) ? data.media_count : null, fetchedAt: new Date().toISOString() };
  } catch {
    return null;
  }
}
