import { loadEvent } from "../../lib/publicEvents";

export const dynamic = "force-dynamic";

/**
 * The prices of an event kept private until its RSVPs open (owner, 18 Nov 2026). The event page asks for them the
 * moment its countdown reaches zero, past the 5-minute page cache. Before the opening this says so (409) and
 * gives nothing away; the RSVP route refuses sign-ups before then anyway.
 */
export async function GET(request) {
  const slug = new URL(request.url).searchParams.get("slug") || "";
  const event = await loadEvent(slug);
  const headers = { "Cache-Control": "no-store" };
  if (!event) return Response.json({ error: "Not found" }, { status: 404, headers });
  if (event.pricePending) return Response.json({ pending: true }, { status: 409, headers });
  const { cost, priceTiers, tickets, dogWaitlistOpen } = event;
  return Response.json({ cost, priceTiers, tickets, dogWaitlistOpen }, { headers });
}
