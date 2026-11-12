"use server";

import { revalidatePath } from "next/cache";
import { sql } from "../lib/db";
import { actionAdmin, backWith } from "../lib/admin/guard";
import { logActivity } from "../lib/admin/log";
import { safeRichHtml } from "../lib/safeRichHtml.mjs";
import { cleanMediaProfile, cleanMediaTimeline, cleanTimelineOrientation } from "../lib/mediaHub.mjs";
import { factSheetText, parseFactSheet, plainText } from "../lib/mediaPressKit.mjs";

const MAX_HTML = 12000;

/** Only strong, em, br and safe links survive (app/lib/safeRichHtml.mjs). */
function cleanHtml(value) {
  return safeRichHtml(String(value || "").trim().slice(0, MAX_HTML));
}

function cleanText(value, max = 500) {
  return String(value || "").trim().slice(0, max);
}

export async function saveMediaHub(data) {
  const admin = await actionAdmin("media:edit");
  const intent = data.get("intent") === "publish" ? "published" : "draft";
  const content = {
    heroTitle: cleanHtml(data.get("heroTitle")),
    heroLead: cleanHtml(data.get("heroLead")),
    about: cleanHtml(data.get("about")),
    mission: cleanHtml(data.get("mission")),
    stories: cleanHtml(data.get("stories")),
    partnerships: cleanHtml(data.get("partnerships")),
    factSheet: factSheetText(parseFactSheet(String(data.get("factSheet") || "").split(/\r?\n/).map(plainText).join("\n"))),
    boilerplateShort: plainText(data.get("boilerplateShort")).slice(0, 1200),
    boilerplateLong: String(data.get("boilerplateLong") || "").split(/\n{2,}/).map(plainText).filter(Boolean).join("\n\n").slice(0, 4000),
    boilerplatesApproved: data.get("boilerplatesApproved") === "on",
    timelineOrientation: cleanTimelineOrientation(data.get("timelineOrientation")),
    timeline: cleanMediaTimeline(data.get("timeline")),
    profile: cleanMediaProfile(data.get("profile")),
    contactEmail: cleanText(data.get("contactEmail"), 160) || "houseofretrieversph@gmail.com",
    seoTitle: cleanText(data.get("seoTitle"), 160),
    seoDescription: cleanText(data.get("seoDescription"), 320),
  };
  await sql(
    `INSERT INTO media_hub_documents (id, content, status, updated_at, updated_by)
     VALUES (true, $1::jsonb, $2, now(), $3)
     ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content, status=EXCLUDED.status, updated_at=now(), updated_by=EXCLUDED.updated_by`,
    [JSON.stringify(content), intent, admin.email],
  );
  await logActivity(admin.email, `media.${intent}`, "Media hub", { status: intent });
  revalidatePath("/media");
  await backWith("/media", "ok", intent === "published" ? "Media hub published." : "Media hub draft saved.");
}
