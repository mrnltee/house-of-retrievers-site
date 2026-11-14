import { sql } from "./db";
import { logActivity } from "./admin/log";
import { cleanEventPicks, replyLabel } from "./eventBrands.mjs";
import { addBrandToEvents } from "./eventBrandsStore";
import { issueSupporterNumber } from "./supporterNumbers";

/**
 * "Add to events" on a brand (owner, 2026-11-14): puts the brand on the ticked
 * events' Brand trackers (`addEvents`, reply `addReply`). A Yes gives the brand
 * its HOR number, like a Yes on the tracker, so it needs the 4-letter code;
 * without one the events are added as No reply yet and the note says why.
 * Nothing is emailed. Returns { added: [{id,title}], number, note }.
 */
export async function applyEventPicks(supporterId, data, actor) {
  const { ids, reply: asked } = cleanEventPicks(data.getAll("addEvents"), data.get("addReply"));
  if (!ids.length) return { added: [], number: "", note: "" };
  const [brand] = await sql("SELECT name, code, number_no FROM supporters WHERE id = $1", [supporterId]);
  if (!brand) return { added: [], number: "", note: "" };
  const noCode = asked === "yes" && !brand.number_no && !brand.code;
  const reply = noCode ? "waiting" : asked;
  const added = await addBrandToEvents(supporterId, ids, reply, actor);
  for (const e of added) await logActivity(actor, "event.brand.add", brand.name, { eventId: e.id, supporterId, reply });
  const number = added.length && reply === "yes" && !brand.number_no ? await issueSupporterNumber(supporterId) : "";
  const note = noCode && added.length ? `Added as ${replyLabel("waiting")}: give ${brand.name} a 4-letter ID code, then mark Yes on each event's Brand tracker.` : "";
  return { added, number, note, reply };
}

/** "Added to A Golden Beginning and Pawssion Walk as Yes." */
export function addedLine({ added = [], reply = "waiting" }) {
  if (!added.length) return "";
  const names = added.map((e) => e.title);
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
  return `Added to ${list} as ${replyLabel(reply)}. Nothing was emailed.`;
}
