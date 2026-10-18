/**
 * An event's own RSVP questions (e.g. "Interested in checking in at Novotel?"),
 * kept in `events.rsvp_form_config.questions`. Each is a required Yes / No;
 * answers are saved as `registrations.custom_answers` ({ id: true|false },
 * migration 043). `showInTable` adds it as a column on the registrations list;
 * every question is on the registration page and in the CSV.
 */

export const MAX_CUSTOM_QUESTIONS = 10;
const ID = /^[a-z0-9]{1,16}$/;

/** The editor's list → [{ id, label, showInTable }]. */
export function cleanCustomQuestions(input) {
  if (!Array.isArray(input)) return [];
  const out = [];
  const used = new Set();
  for (const row of input) {
    const label = String(row?.label ?? "").trim().replace(/\s+/g, " ").slice(0, 200);
    if (!label) continue;
    let id = ID.test(row?.id) ? row.id : "";
    if (!id || used.has(id)) {
      let n = out.length + 1;
      while (used.has(`q${n}`)) n++;
      id = `q${n}`;
    }
    used.add(id);
    out.push({ id, label, showInTable: Boolean(row?.showInTable) });
    if (out.length === MAX_CUSTOM_QUESTIONS) break;
  }
  return out;
}

/** The RSVP's answers ({ id: "yes" | "no" }) → { value: { id: boolean } | null } or { error }. */
export function readCustomAnswers(questions, input) {
  if (!questions?.length) return { value: null };
  const value = {};
  for (const q of questions) {
    const answer = input?.[q.id];
    if (answer !== "yes" && answer !== "no") return { error: `Please answer: ${q.label}` };
    value[q.id] = answer === "yes";
  }
  return { value };
}

export const answerText = (answer) => (answer === true ? "Yes" : answer === false ? "No" : "");

/** An admin's add/edit form (`custom_<id>` = "yes" | "no" | "") → { id: boolean } for the answered ones, or null. */
export function adminCustomAnswers(questions, get) {
  const value = {};
  for (const q of questions || []) {
    const answer = get(`custom_${q.id}`);
    if (answer === "yes" || answer === "no") value[q.id] = answer === "yes";
  }
  return Object.keys(value).length ? value : null;
}
