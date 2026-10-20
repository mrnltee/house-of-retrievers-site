"use server";

import { revalidatePath } from "next/cache";
import { sql } from "../lib/db";
import { actionAdmin, backWith } from "../lib/admin/guard";
import { logActivity } from "../lib/admin/log";
import { cleanMediaTimeline, cleanTimelineOrientation } from "../lib/mediaHub.mjs";

const ALLOWED_TAGS = /<(?!\/?(?:strong|em|a|br)\b)[^>]*>/gi;
const MAX_HTML = 12000;

function cleanHtml(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/ on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "")
    .replace(ALLOWED_TAGS, "")
    .trim()
    .slice(0, MAX_HTML);
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
    timelineOrientation: cleanTimelineOrientation(data.get("timelineOrientation")),
    timeline: cleanMediaTimeline(data.get("timeline")),
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
