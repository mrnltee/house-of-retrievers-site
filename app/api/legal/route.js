/**
 * The society's registered name and SEC number. The pre-launch release gate
 * was retired with the countdown after the 10 Oct 2026 launch.
 */
import { LEGAL } from "../../lib/legal.mjs";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { org: LEGAL.org, sec: LEGAL.sec },
    { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } },
  );
}
