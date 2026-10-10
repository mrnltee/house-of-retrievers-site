import { cancelEvent, publishEvent, saveEvent, unpublishEvent } from "../../actions";
import { CATEGORIES, PURPOSES, SUMMARY_MAX, validateEvent } from "../../../lib/admin/events.mjs";
import { isoDate } from "../ui";
import EventPhoto from "./EventPhoto";
import { CharityField, HashtagField, RegistrationCard, VenueField } from "./EventFields";

/** Shared by "Create event" and "Edit event". `event` is a DB row or null. */
export default function EventForm({ event, autoDescribe = false }) {
  const v = (key, fallback = "") => (event?.[key] ?? fallback);
  const missing = event
    ? validateEvent({
        title: event.title, category: event.category, date: isoDate(event.date), venue: event.venue, city: event.city,
        summary: event.summary, image: event.image, imageAlt: event.image_alt, isCharity: event.is_charity, supports: event.supports,
      }).missing || []
    : [];

  return (
    <form action={saveEvent} className="form">
      {event && <input type="hidden" name="id" value={event.id} />}
      <section className="card">
        <h2>Event details</h2>
        <label className="field"><span>Title</span><input type="text" name="title" required maxLength={120} defaultValue={v("title")} /></label>
        <div className="row-2">
          <label className="field"><span>Category</span>
            <select name="category" defaultValue={v("category")}>
              <option value="">Choose…</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="field"><span>Purpose <small>Which of HOR's purposes this event serves</small></span>
            <select name="purpose" defaultValue={v("purpose")}>
              <option value="">Choose…</option>
              {PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
        </div>
        <div className="row-3">
          <label className="field"><span>Date</span><input type="date" name="date" required defaultValue={event ? isoDate(event.date) : ""} /></label>
          <label className="field"><span>Starts</span><input type="time" name="startTime" defaultValue={v("start_time")} /></label>
          <label className="field"><span>Ends</span><input type="time" name="endTime" defaultValue={v("end_time")} /></label>
        </div>
        <label className="field"><span>Cost <small>e.g. Free, or ₱500</small></span><input type="text" name="cost" maxLength={60} defaultValue={v("cost")} /></label>
        <CharityField isCharity={event?.is_charity} supports={event?.supports} />
        <label className="field"><span>Summary <small>As long as you need. Line breaks are kept. The card shows the first few lines; the event page shows all of it.</small></span>
          <textarea name="summary" maxLength={SUMMARY_MAX} rows={8} defaultValue={v("summary")} />
        </label>
        <HashtagField hashtags={event?.hashtags} />
      </section>

      <section className="card">
        <h2>Where</h2>
        <VenueField venue={event?.venue} city={event?.city} lat={event?.venue_lat} lng={event?.venue_lng} mapUrl={event?.map_url} />
      </section>

      <section className="card">
        <h2>Cover photo</h2>
        <EventPhoto key={event?.image || "none"} current={event?.image || ""} currentAlt={event?.image_alt || ""} currentSource={event?.image_source || ""} currentCrop={event?.image_crop || null} autoDescribe={autoDescribe} />
      </section>

      <RegistrationCard
        registration={event?.registration}
        capacity={event?.capacity}
        rsvpOpen={event ? event.rsvp_open : true}
        feeRequired={event?.fee_required}
        date={event ? isoDate(event.date) : ""}
      />

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
