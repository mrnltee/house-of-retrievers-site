import { REPLIES, eventChoiceGroups } from "../../../lib/eventBrands.mjs";
import { formatDay, manilaToday } from "../ui";

/**
 * "Add to events" (owner, 2026-11-14): tick upcoming or past events to put a
 * brand on their Brand trackers, with one reply for all of them. Sends
 * `addEvents` (event ids) and `addReply`. `events` = eventsForBrand().
 */
export default function EventPicker({ events = [], checked = [] }) {
  const { upcoming, past } = eventChoiceGroups(events, manilaToday());
  if (!upcoming.length && !past.length) return <p className="small muted" style={{ margin: 0 }}>No events to add it to yet.</p>;
  const group = (label, list) => list.length > 0 && (
    <fieldset className="plain">
      <legend className="field-head">{label}</legend>
      <ul className="tracker-pick event-pick">
        {list.map((e) => (
          <li key={e.id}>
            <label className="check">
              <input type="checkbox" name="addEvents" value={e.id} defaultChecked={checked.includes(e.id)} />
              <span>{e.title} <span className="small muted">· {e.date ? formatDay(e.date) : "no date"}{e.status === "draft" ? " · draft" : ""}</span></span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
  return (
    <>
      {group("Upcoming", upcoming)}
      {group("Past", past)}
      <label className="field"><span>Their reply <small>For every event ticked; change it per event on its Brand tracker</small></span>
        <select name="addReply" defaultValue="waiting">{REPLIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      </label>
    </>
  );
}
