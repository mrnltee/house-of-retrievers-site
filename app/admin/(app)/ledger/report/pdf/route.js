import { currentAdmin } from "../../../../../lib/admin/auth";
import { can } from "../../../../../lib/admin/roles.mjs";
import { eventBreakdown, transparencyReport } from "../../../../../lib/ledger.mjs";
import { loadLedger } from "../../../../../lib/ledgerStore";
import { ledgerReportPdf } from "../../../../../lib/ledgerReportPdf";
import { manilaDate } from "../../../../../lib/journeyEntries.mjs";

export const dynamic = "force-dynamic";

const isUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ""));
const day = (d) => new Date(`${String(d).slice(0, 10)}T12:00:00+08:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" });

/** The transparency report as a PDF (owner, 22 Nov 2026), for admins who can see the ledger. `?event=` as the page. */
export async function GET(request) {
  const admin = await currentAdmin();
  if (!admin || !can(admin, "ledger:view")) return new Response("Not allowed", { status: 403 });
  const param = new URL(request.url).searchParams.get("event");
  const scope = isUuid(param) ? param : param === "general" ? "general" : "all";
  const { lines, events } = await loadLedger(scope);
  const event = isUuid(scope) ? events.find((e) => e.id === scope) : null;
  if (isUuid(scope) && !event) return new Response("Not found", { status: 404 });
  const title = event ? event.title : scope === "general" ? "HoR's general funds (not tied to an event)" : "All events";
  const subtitle = `The House of Retrievers’ Society, Inc. · ${event?.date ? `Event date ${day(event.date)} · ` : ""}Prepared ${day(manilaDate())} · Amounts in Philippine pesos`;
  const pdf = await ledgerReportPdf({ title, subtitle, report: transparencyReport(lines), rows: scope === "all" ? eventBreakdown(lines, events) : [] });
  const slug = (event ? event.title : scope === "general" ? "general" : "all-events").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="hor-transparency-report-${slug}-${manilaDate()}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
