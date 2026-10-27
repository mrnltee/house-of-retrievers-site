"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "../lib/db";
import { currentAdmin, PREVIEW_COOKIE } from "../lib/admin/auth";
import { adminHref, backWith } from "../lib/admin/guard";
import { logActivity } from "../lib/admin/log";
import { parseEmailList } from "../lib/admin/roles.mjs";

/**
 * Preview the admin as someone (owner, 2026-10-27). Owners only. While it's
 * on, the Owner sees that person's menu and pages and every change is refused
 * (see actionAdmin). Server actions, so another site can't switch it on.
 */
export async function startPreview(data) {
  const admin = await currentAdmin();
  const ownerEmail = admin?.preview ? admin.previewBy : admin?.roles.includes("owner") ? admin.email : null;
  if (!ownerEmail) await backWith("/admins", "error", "Only Owners can preview as someone else.");
  const [email] = parseEmailList(data.get("email"));
  const [them] = email ? await sql("SELECT email, roles FROM admins WHERE email = $1 AND active", [email]) : [];
  if (!them || them.roles.includes("owner")) await backWith("/admins", "error", "Pick someone who isn't an Owner to preview.");
  (await cookies()).set(PREVIEW_COOKIE, them.email, { path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 });
  await logActivity(ownerEmail, "admin.preview", them.email);
  redirect(await adminHref("/"));
}

export async function exitPreview() {
  (await cookies()).delete({ name: PREVIEW_COOKIE, path: "/" });
  redirect(await adminHref("/admins"));
}
