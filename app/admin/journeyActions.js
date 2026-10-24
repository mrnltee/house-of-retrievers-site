"use server";

import { revalidatePath } from "next/cache";
import { sql } from "../lib/db";
import { actionAdmin, backWith } from "../lib/admin/guard";
import { logActivity } from "../lib/admin/log";
import { cleanJourneyOrientation, cleanJourneyShow } from "../lib/journeySettings.mjs";

export async function saveJourneySettings(data) {
  const admin = await actionAdmin("media:edit");
  const show = cleanJourneyShow(data.get("show"));
  const orientation = cleanJourneyOrientation(data.get("orientation"));
  await sql(
    `INSERT INTO journey_settings (id, show, orientation, updated_at, updated_by)
     VALUES (true, $1, $2, now(), $3)
     ON CONFLICT (id) DO UPDATE SET show=EXCLUDED.show, orientation=EXCLUDED.orientation, updated_at=now(), updated_by=EXCLUDED.updated_by`,
    [show, orientation, admin.email],
  );
  await logActivity(admin.email, "journey.save", "Our journey timeline", { show, orientation });
  revalidatePath("/");
  await backWith("/journey", "ok", "Journey timeline settings saved.");
}
