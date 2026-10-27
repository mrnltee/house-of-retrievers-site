import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "../../../lib/db";
import { currentAdmin, PREVIEW_COOKIE } from "../../../lib/admin/auth";
import { adminHref } from "../../../lib/admin/guard";
import { logActivity } from "../../../lib/admin/log";
import { parseEmailList } from "../../../lib/admin/roles.mjs";

export const dynamic = "force-dynamic";

/**
 * Preview the admin as someone (owner, 2026-10-27): ?as=<email> starts,
 * ?exit=1 ends. Owners only. While it's on, the Owner sees that person's
 * menu and pages and every change is refused (see actionAdmin).
 */
export async function GET(request) {
  const url = new URL(request.url);
  const jar = await cookies();
  if (url.searchParams.has("exit")) {
    jar.delete({ name: PREVIEW_COOKIE, path: "/" });
    redirect(await adminHref("/admins"));
  }
  const admin = await currentAdmin();
  const ownerEmail = admin?.preview ? admin.previewBy : admin?.roles.includes("owner") ? admin.email : null;
  if (!ownerEmail) return new Response("Only Owners can preview as someone else.", { status: 403 });
  const [email] = parseEmailList(url.searchParams.get("as"));
  const [them] = email ? await sql("SELECT email, roles FROM admins WHERE email = $1 AND active", [email]) : [];
  if (!them || them.roles.includes("owner")) redirect(`${await adminHref("/admins")}?error=${encodeURIComponent("Pick someone who isn't an Owner to preview.")}`);
  jar.set(PREVIEW_COOKIE, them.email, { path: "/", httpOnly: true, sameSite: "lax", secure: url.protocol === "https:", maxAge: 60 * 60 });
  await logActivity(ownerEmail, "admin.preview", them.email);
  redirect(await adminHref("/"));
}
