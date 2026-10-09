import { cancelEvent, publishEvent, saveEvent, unpublishEvent } from "../../actions";
import { CATEGORIES, validateEvent } from "../../../lib/admin/events.mjs";
import { isoDate } from "../ui";
import EventPhoto from "./EventPhoto";

/** Shared by "Create event" and "Edit event". `event` is a DB row or null. */
export default function EventForm({ event }) {
  const v = (key, fallback = "") => (event?.[key] ?? fallback);
  const missing = event
    ? validateEvent({
        title: event.title, category: event.category, date: isoDate(event.date), venue: event.venue, city: event.city,
        summary: event.summary, image: event.image, imageAlt: event.image_alt,
      }).missing || []
    : [];

  return (
    <form action={saveEvent} className="form">
      {event && <input type="hidden" name="id" value={event.id} />}
      <section className="card">
        <h2>Event details</h2>
        <label className="field"><span>Title</span><input type="text" name="title" required maxLength={120} defaultValue={v("title")} /></label>
        <div className="row-3">
          <label className="field"><span>Category</span>
            <select name="category" defaultValue={v("category")}>
              <option value="">Choose…</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="field"><span>Date</span><input type="date" name="date" required defaultValue={event ? isoDate(event.date) : ""} /></label>
          <div className="row-2">
            <label className="field"><span>Starts</span><input type="time" name="startTime" defaultValue={v("start_time")} /></label>
            <label className="field"><span>Ends</span><input type="time" name="endTime" defaultValue={v("end_time")} /></label>
          </div>
        </div>
        <div className="row-2">
          <label className="field"><span>Venue</span><input type="text" name="venue" maxLength={160} defaultValue={v("venue")} /></label>
          <label className="field"><span>City</span><input type="text" name="city" maxLength={80} defaultValue={v("city")} /></label>
        </div>
        <div className="row-2">
          <label className="field"><span>Cost <small>e.g. Free, or ₱500</small></span><input type="text" name="cost" maxLength={60} defaultValue={v("cost")} /></label>
          <label className="field"><span>Supports <small>The beneficiary, named up front</small></span><input type="text" name="supports" maxLength={160} defaultValue={v("supports")} /></label>
        </div>
        <label className="field"><span>Summary <small>One or two plain sentences</small></span><textarea name="summary" maxLength={600} defaultValue={v("summary")} /></label>
        <EventPhoto current={event?.image || ""} currentAlt={event?.image_alt || ""} />
      </section>

      <section className="card">
        <h2>Registration</h2>
        <fieldset className="plain">
          <legend>Do people sign up?</legend>
          <label className="check"><input type="radio" name="registration" value="none" defaultChecked={v("registration", "none") === "none"} /> No, anyone can come along</label>
          <label className="check"><input type="radio" name="registration" value="required" defaultChecked={v("registration") === "required"} /> Yes, they RSVP on the events page</label>
        </fieldset>
        <div className="row-2">
          <label className="field"><span>Capacity <small>Empty for no limit. When full, new sign-ups join the waitlist.</small></span><input type="number" name="capacity" min={1} max={5000} defaultValue={v("capacity", "")} /></label>
          <div className="form">
            <label className="check"><input type="checkbox" name="rsvpOpen" defaultChecked={event ? event.rsvp_open : true} /> RSVPs are open</label>
            <label className="check"><input type="checkbox" name="feeRequired" defaultChecked={Boolean(event?.fee_required)} /> A fee is paid by QR before the day (track it per person)</label>
          </div>
        </div>
      </section>

      {missing.length > 0 && <p className="banner note small">Needed before publishing: {missing.join(", ")}.</p>}
      <div className="actions">
        <button className="btn ghost">Save draft</button>
        {event?.status !== "published" && <button className="btn gold" formAction={publishEvent}>Publish</button>}
        {event?.status === "published" && <button className="btn gold">Save changes</button>}
        {event?.status === "published" && <button className="btn ghost" formAction={unpublishEvent}>Move back to draft</button>}
        {event && event.status !== "cancelled" && <button className="btn danger" formAction={cancelEvent}>Cancel event</button>}
      </div>
    </form>
  );
}
