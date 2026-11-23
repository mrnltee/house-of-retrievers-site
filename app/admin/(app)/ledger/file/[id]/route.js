import { sql } from "../../../../../lib/db";
import { currentAdmin } from "../../../../../lib/admin/auth";
import { can } from "../../../../../lib/admin/roles.mjs";

export const dynamic = "force-dynamic";

/**
 * A ledger line's receipt or proof (owner, 22 Nov 2026), for signed-in admins who can see the ledger.
 * Shown in the browser (inline) and cached in the admin's own browser only.
 * `?download=1` saves it instead.
 */
export async function GET(request, { params }) {
  const admin = await currentAdmin();
  if (!admin || !can(admin, "ledger:view")) return new Response("Not allowed", { status: 403 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const [row] = await sql("SELECT mime, name, data FROM ledger_files WHERE id = $1", [id]);
  if (!row) return new Response("Not found", { status: 404 });
  const download = new URL(request.url).searchParams.get("download") === "1";
  const name = String(row.name || "file").replace(/["\\\r\n]/g, "_");
  return new Response(row.data, {
    headers: {
      "Content-Type": row.mime,
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${name}"`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      Vary: "Cookie",
    },
  });
}
