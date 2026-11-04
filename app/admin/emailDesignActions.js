"use server";

import { sql } from "../lib/db";
import { actionAdmin, backWith, Forbidden } from "../lib/admin/guard";
import { logActivity } from "../lib/admin/log";
import { pictureFrom } from "../lib/admin/imageUpload";
import { emailReady, sendEmail } from "../lib/email";
import { DESIGN_LIMITS, KINDS, STARTERS, cleanDoc, fillDesign, renderDesign } from "../lib/emailDesign.mjs";
import { loadDesign, loadHouse } from "../lib/emailDesignStore";
import { letterDate } from "../lib/letters.mjs";

const form = (data, key) => (typeof data.get(key) === "string" ? data.get(key) : "");
const isUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ""));
const LIBRARY = "/emails/designs";
const editorOf = (id) => `/emails/designs/${id}`;

async function guarded(path, work) {
  try {
    return await work();
  } catch (error) {
    if (error instanceof Forbidden) await backWith(path, "error", error.message);
    throw error;
  }
}

/** A new design: a kind's starter, or a copy of another design ("from"); with "event", an event's own copy. */
export async function createDesign(data) {
  const eventId = isUuid(form(data, "event")) ? form(data, "event") : null;
  const back = eventId ? `/events/${eventId}/letters` : LIBRARY;
  return guarded(back, async () => {
    const admin = await actionAdmin("letters:edit");
    const from = form(data, "from") ? await loadDesign(form(data, "from")) : null;
    if (form(data, "from") && (!from || from.kind === "house")) await backWith(back, "error", "The design to copy wasn't found.");
    const kind = from?.kind || form(data, "kind");
    if (!KINDS.some(([k]) => k === kind)) await backWith(back, "error", "Pick what kind of email to make.");
    if (eventId && !(await sql("SELECT 1 FROM events WHERE id = $1", [eventId])).length) await backWith("/events", "error", "That event wasn't found.");
    const start = from ? { name: from.name, subject: from.subject, doc: from.doc } : STARTERS[kind];
    const [event] = eventId ? await sql("SELECT title FROM events WHERE id = $1", [eventId]) : [];
    const name = (form(data, "name").trim() || (event ? `${start.name} — ${event.title}` : from ? `Copy of ${from.name}` : start.name)).slice(0, DESIGN_LIMITS.name);
    const [row] = await sql(
      `INSERT INTO email_designs (kind, name, subject, doc, event_id, based_on, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7) RETURNING id`,
      [kind, name, start.subject, JSON.stringify(start.doc), eventId, from?.id || null, admin.email],
    );
    await logActivity(admin.email, "emailDesign.create", name, { designId: row.id, kind, eventId, from: from?.id || null });
    await backWith(editorOf(row.id), "ok", "Made. Edit it, then save.");
  });
}

/** Saves a design (name, subject, document) or, for the house row, HOR's shared header and footer. */
export async function saveDesign(data) {
  const id = form(data, "id");
  const back = id === "house" ? `${LIBRARY}/house` : isUuid(id) ? editorOf(id) : LIBRARY;
  return guarded(back, async () => {
    const admin = await actionAdmin("letters:edit");
    let parsed;
    try { parsed = JSON.parse(form(data, "doc") || "{}"); } catch { parsed = null; }
    if (!parsed) await backWith(back, "error", "The design didn't come through. Reload and try again.");
    const { doc, error } = cleanDoc(id === "house" ? { ...parsed, ownHeader: true, ownFooter: true, body: { blocks: [] } } : parsed);
    if (error) await backWith(back, "error", error);
    if (id === "house") {
      await sql(
        `INSERT INTO email_designs (kind, name, subject, doc, created_by, updated_by) VALUES ('house', 'HOR header & footer', '', $1, $2, $2)
         ON CONFLICT ((kind)) WHERE kind = 'house' DO UPDATE SET doc = EXCLUDED.doc, updated_by = EXCLUDED.updated_by, updated_at = now()`,
        [JSON.stringify({ header: doc.header, footer: doc.footer }), admin.email],
      );
      await logActivity(admin.email, "emailDesign.house", "HOR header & footer", {});
      await backWith(back, "ok", "HOR header and footer saved. Every design that uses them now shows the change.");
    }
    const before = await loadDesign(id);
    if (!before || before.kind === "house") await backWith(LIBRARY, "error", "That design no longer exists.");
    const name = form(data, "name").trim().slice(0, DESIGN_LIMITS.name);
    if (!name) await backWith(back, "error", "Give the design a name.");
    const subject = form(data, "subject").trim().slice(0, DESIGN_LIMITS.subject);
    await sql("UPDATE email_designs SET name = $2, subject = $3, doc = $4, updated_by = $5, updated_at = now() WHERE id = $1", [id, name, subject, JSON.stringify(doc), admin.email]);
    await logActivity(admin.email, "emailDesign.save", name, { designId: id });
    await backWith(back, "ok", "Saved.");
  });
}

/** Back to HOR's default header and footer. */
export async function resetHouse() {
  return guarded(`${LIBRARY}/house`, async () => {
    const admin = await actionAdmin("letters:edit");
    await sql("DELETE FROM email_designs WHERE kind = 'house'");
    await logActivity(admin.email, "emailDesign.houseReset", "HOR header & footer", {});
    await backWith(`${LIBRARY}/house`, "ok", "Back to HOR's standard header and footer.");
  });
}

export async function deleteDesign(data) {
  const id = form(data, "id");
  const design = await loadDesign(id);
  const back = design?.event_id ? `/events/${design.event_id}/letters` : LIBRARY;
  return guarded(back, async () => {
    const admin = await actionAdmin("letters:edit");
    if (!design || design.kind === "house") await backWith(back, "error", "That design wasn't found.");
    await sql("DELETE FROM email_designs WHERE id = $1", [id]);
    await logActivity(admin.email, "emailDesign.delete", design.name, { designId: id });
    await backWith(back, "ok", `Deleted “${design.name}”. Emails already sent are unchanged.`);
  });
}

/** A picture for a design (from the editor, already shrunk in the browser): stored like brand logos. */
export async function uploadDesignImage(dataUrl) {
  const admin = await actionAdmin("letters:edit");
  const data = new FormData();
  data.set("imgData", String(dataUrl || ""));
  const { url, error } = await pictureFrom(data, "img", admin.email);
  return error ? { error } : { src: url };
}

const SAMPLE = { "Company Name": "Sample Brand", Salutation: "Sample Brand team", "Their Contact Person": "Sam Sample", "Event Name": "Your event", "Event Date": "Saturday, December 5, 2026", "Event Time": "1:00 – 2:00 PM", "Event Location": "Venue, City", "Event Link": "https://events.houseofretrieversph.org/", "Event Beneficiaries": "our beneficiaries", "Signatory Name": "HOR team", "Signatory Position": "House of Retrievers" };
const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** "Send a test to me": the saved design, with sample fill-ins, to the signed-in admin only. */
export async function sendDesignTest(data) {
  const id = form(data, "id");
  return guarded(editorOf(id), async () => {
    const admin = await actionAdmin("letters:edit");
    if (!emailReady()) await backWith(editorOf(id), "error", "Email isn't set up yet (Resend key missing).");
    const design = await loadDesign(id);
    if (!design || design.kind === "house") await backWith(LIBRARY, "error", "That design wasn't found.");
    const values = { ...SAMPLE, Date: letterDate() };
    const fill = (text, { html }) => String(text).replace(/\[([^\]\n]{1,400})\](?!\(https:\/\/)/g, (whole, label) => {
      const v = values[label.replace(/\?$/, "").trim()];
      return v == null ? whole : html ? esc(v) : v;
    });
    const filled = fillDesign(design.doc, design.subject || design.name, fill);
    const mail = renderDesign(filled.doc, { house: await loadHouse(), subject: `[Test] ${filled.subject}` });
    const result = await sendEmail({ to: admin.email, ...mail, idempotencyKey: `design-test/${id}/${Date.now()}` });
    if (!result.ok) await backWith(editorOf(id), "error", "The test didn't send. Try again in a minute.");
    await logActivity(admin.email, "emailDesign.test", design.name, { designId: id, to: admin.email });
    await backWith(editorOf(id), "ok", `Test sent to ${admin.email}, with sample fill-ins.`);
  });
}

