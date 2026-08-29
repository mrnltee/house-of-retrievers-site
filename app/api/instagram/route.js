import { NextResponse } from "next/server";
import { getAccessToken } from "../../lib/instagramToken";

export const runtime = "nodejs";

export async function GET() {
  const { token: accessToken } = await getAccessToken();
  const userId = process.env.INSTAGRAM_USER_ID || "17841440369853992";
  const apiVersion = process.env.INSTAGRAM_API_VERSION || "v26.0";

  if (!accessToken) {
    return NextResponse.json(
      { error: "Instagram feed is not configured" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const fields = "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username";
  const endpoint = `https://graph.instagram.com/${apiVersion}/${encodeURIComponent(userId)}/media?fields=${fields}&limit=12`;

  try {
    const response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
      next: { revalidate: 3600, tags: ["instagram"] },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Instagram feed request failed" },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    const payload = await response.json();
    const posts = (Array.isArray(payload.data) ? payload.data : [])
      .map((post) => ({
        id: post.id,
        caption: typeof post.caption === "string" ? post.caption : "",
        mediaType: post.media_type,
        imageUrl: post.media_type === "VIDEO" ? post.thumbnail_url || post.media_url : post.media_url,
        permalink: post.permalink,
        timestamp: post.timestamp,
      }))
      .filter((post) => post.id && post.imageUrl && post.permalink);

    return NextResponse.json(
      { posts },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Instagram feed is temporarily unavailable" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
