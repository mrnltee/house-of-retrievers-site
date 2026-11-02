import { GREETINGS, brandGreeting, teamOf } from "../../../lib/letters.mjs";

/**
 * How letters greet a brand (owner, 2026-11-02): its contact person, the brand's
 * team ("Dear Apple team,"), or HOR's own wording. Shown on the brand form and on
 * an event's Brand tracker; one choice per brand, used for every event.
 */
export default function GreetingFields({ row = {} }) {
  const name = row.name || "the brand";
  const contactName = row.contact_name || "";
  // A greeting typed before this choice existed shows as "My own wording".
  const current = row.greeting && row.greeting !== "auto" ? row.greeting : row.salutation ? "custom" : "auto";
  const example = (greeting) => brandGreeting({ name, contactName, salutation: row.salutation || "", greeting });
  const hint = { auto: "own wording if typed, else the contact person, else the team", contact: contactName ? "" : "no contact person yet, so the team for now", team: "", custom: "type it below" };
  return (
    <div className="row-2">
      <label className="field"><span>Greet them as <small>How letters and emails open</small></span>
        <select name="greeting" defaultValue={current}>
          {GREETINGS.map(([k, l]) => <option key={k} value={k}>{l}{k === "custom" ? "" : ` — Dear ${k === "team" ? teamOf(name) : example(k)},`}{hint[k] ? ` (${hint[k]})` : ""}</option>)}
        </select>
      </label>
      <label className="field"><span>My own wording <small>Used with “My own wording”: Dear ___, e.g. Ms. Jessie</small></span><input type="text" name="salutation" maxLength={120} defaultValue={row.salutation || ""} placeholder="Ms. Jessie" /></label>
    </div>
  );
}
