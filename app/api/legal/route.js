/**
 * The society's registered name and SEC number. The pre-launch release gate
 * was retired with the countdown after the 10 Oct 2026 launch.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { org: "The House of Retrievers Society Inc.", sec: "2026090268846-06" },
    { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } },
  );
}
