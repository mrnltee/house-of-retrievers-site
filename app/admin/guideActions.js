"use server";

import { sql } from "../lib/db";
import { currentAdmin } from "../lib/admin/auth";

/**
 * The on-screen guide (owner, 2026-10-27). Finishing or skipping it marks the
 * person as welcomed and saves whether they ticked "Don't show this again".
 * Only touches the signed-in person's own row; nothing while an Owner previews.
 */
export async function finishGuide(hide) {
  const admin = await currentAdmin();
  if (!admin || admin.preview) return;
  await sql("UPDATE admins SET welcomed_at = COALESCE(welcomed_at, now()), guide_hidden = $2 WHERE email = $1", [admin.email, Boolean(hide)]);
}
