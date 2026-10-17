import { cancelEvent, publishEvent, saveEvent, unpublishEvent } from "../../actions";
import { CATEGORIES, PURPOSES, SUMMARY_MAX, eventTiers, validateEvent } from "../../../lib/admin/events.mjs";
import { isoDate } from "../ui";
import ConfirmSave from "./ConfirmSave";
import EventGallery from "./EventGallery";
import EventPhoto from "./EventPhoto";
import EventPreview from "./EventPreview";
import { sql } from "../../../lib/db";
import { listCustomTemplates } from "../../../lib/emailSettings";
import { TICKET_COUNTS_SQL, countsFromRows } from "../../../lib/ticketCounts.mjs";
import { CharityField, CheckinSettings, HashtagField, MoreOptions, PriceField, RsvpFormSettings, SignupFields, SupportersField, VenueField, WhenFields } from "./EventFields";

/** Shared by "Create event" and "Edit event". `event` is a DB row or null. */
/** Names to suggest: confirmed-or-not Partners and Sponsors from People (organization first). */
async function supporterNames(kind) {
  try {
    // Sponsor and partner records first (their names link the event to the record), then People not yet recorded.
    const rows = await sql(
      `SELECT n FROM (
         SELECT name AS n, 0 AS o FROM supporters WHERE kind = $1 AND status <> 'ended'
         UNION SELECT coalesce(nullif(organization, ''), name), 1 FROM people WHERE kind = $1
       ) x GROUP BY n ORDER BY min(o), n LIMIT 200`,
      [kind],
    );
    return rows.map((r) => r.n).filter(Boolean);
  } catch {
    return [];
  }
}

export default async function EventForm({ event, autoDescribe = false }) {
  const [partnerNames, sponsorNames, emailTemplates, ticketCounts] = await Promise.all([
    supporterNames("Partner"), supporterNames("Sponsor"), listCustomTemplates("event"),
    event ? sql(TICKET_COUNTS_SQL, [event.id]).then(countsFromRows).catch(() => ({})) : {},
  ]);
  const v = (key, fallback = "") => (event?.[key] ?? fallback);
  const missing = event
    ? validateEvent({
        title: event.title, category: event.category, date: isoDate(event.date), venue: event.venue, city: event.city,
        summary: event.summary, image: event.image, imageAlt: event.image_alt, isCharity: event.is_charity, supports: event.supports,
      }).missing || []
    : [];

  return (
    <form action={saveEvent} className="form event-form">
      {event && <input type="hidden" name="id" value={event.id} />}
      <section className="card">
        <h2>The basics</h2>
        <label className="field"><span>Title</span><input type="text" name="title" required maxLength={120} defaultValue={v("title")} placeholder="e.g. Retriever Romp" /></label>
        <WhenFields date={event ? isoDate(event.date) : ""} allDay={event?.all_day} startTime={event?.start_time} endTime={event?.end_time} />
        <VenueField venue={event?.venue} city={event?.city} address={event?.venue_address} lat={event?.venue_lat} lng={event?.venue_lng} mapUrl={event?.map_url} />
      </section>

      <section className="card">
        <h2>Photos</h2>
        <EventPhoto key={event?.image || "none"} current={event?.image || ""} currentAlt={event?.image_alt || ""} currentSource={event?.image_source || ""} currentCrop={event?.image_crop || null} currentFit={event?.image_fit || "fit"} autoDescribe={autoDescribe} />
        <EventGallery initial={Array.isArray(event?.gallery) ? event.gallery : []} autoDescribe={autoDescribe} />
      </section>

      <section className="card">
        <h2>About the event</h2>
        <label className="field"><span>Summary <small>As long as you need. Line breaks are kept. The card shows the first few lines; the event page shows all of it.</small></span>
          <textarea name="summary" maxLength={SUMMARY_MAX} rows={7} defaultValue={v("summary")} />
        </label>
        <div className="row-2">
          <label className="field"><span>Category</span>
            <select name="category" defaultValue={v("category")}>
              <option value="">Choose…</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="field"><span>Purpose <small>Optional</small></span>
            <select name="purpose" defaultValue={v("purpose")}>
              <option value="">Choose…</option>
              {PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
        </div>
        <label className="field"><span>What's included <small>Optional. One per line, up to 10, e.g. what a pass or ticket gets you. Shown as a checklist, so it's readable even when it's also on the poster.</small></span>
          <textarea name="included" rows={4} maxLength={900} defaultValue={(event?.included || []).join("\n")} placeholder={"Bedazzling kit\n1 drink\nFurbaby treat"} />
        </label>
        <CharityField isCharity={event?.is_charity} supports={event?.supports} />
        <HashtagField hashtags={event?.hashtags} />
        <SupportersField name="partners" label="Partners" hint="Optional. Groups or businesses running this with HOR, e.g. a venue or a vet clinic" initial={event?.partners} suggestions={partnerNames} />
        <SupportersField name="sponsors" label="Sponsors" hint="Optional. Who is giving money, products or prizes" initial={event?.sponsors} suggestions={sponsorNames} />
      </section>

      <section className="card">
        <h2>Registration</h2>
        <p className="small muted section-lead">Decide whether people can RSVP, how many can attend, and what information they need to provide.</p>
        <SignupFields
          registration={event?.registration}
          capacity={event?.capacity}
          capacityBasis={event?.capacity_basis}
          rsvpOpen={event ? event.rsvp_open : true}
          rsvpLabel={event?.rsvp_label}
          vaccinationRecordRequired={event?.vaccination_record_required}
          feeRequired={event?.fee_required}
          onsitePayment={event?.onsite_payment}
          paymentHoldMinutes={event?.payment_hold_minutes}
          date={event ? isoDate(event.date) : ""}
          rsvpOpensAt={event?.rsvp_opens_at ? new Date(event.rsvp_opens_at).toISOString() : ""}
          rsvpFormConfig={event?.rsvp_form_config}
        />
      </section>

      <section className="card">
        <h2>Pricing and availability</h2>
        <p className="small muted section-lead">Set the ticket rules first, then add sale periods or Early Bird limits. Pricing decides what a group pays; Capacity in Registration decides how many venue slots it uses.</p>
        <PriceField tiers={event ? eventTiers(event) : []} legacyCost={event && !eventTiers(event).length ? event.cost || "" : ""} counts={ticketCounts} pricingBasis={event?.pricing_basis || "registration"} includedFurbabiesPerHuman={event?.included_furbabies_per_human || 0} additionalFurbabyFee={event?.additional_furbaby_fee || 0} />
      </section>

      <section className="card">
        <h2>Confirmation</h2>
        <p className="small muted section-lead">Choose the wording people receive after they RSVP. The event details and pass button are always added automatically.</p>
        <label className="field"><span>Confirmation email <small>What people get when they RSVP and have a spot. Write your own in Email templates (Event confirmation). The event's details and the pass button are always added.</small></span>
          <select name="emailTemplateId" defaultValue={v("email_template_id") || ""}>
            <option value="">Standard RSVP confirmation</option>
            {emailTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
      </section>

      <CheckinSettings eventId={event?.id} message={event?.checkin_success_message} preset={event?.checkin_sound_preset} failurePreset={event?.checkin_failure_sound_preset} hasCustomSound={Boolean(event?.checkin_sound_data)} />

      <MoreOptions slug={event?.slug} photoUploads={event?.photo_uploads} />

      {missing.length > 0 && <p className="banner note small">Needed before publishing: {missing.join(", ")}.</p>}
      <div className="actions form-actions-sticky">
        <EventPreview image={event?.image || ""} imageSource={event?.image_source || ""} slug={event?.slug || ""} />
        <button className="btn ghost" data-confirm="draft">Save draft</button>
        {event?.status !== "published" && <button className="btn gold" formAction={publishEvent} data-confirm="publish">Publish</button>}
        {event?.status === "published" && <button className="btn gold" data-confirm="save">Save changes</button>}
        {event?.status === "published" && <button className="btn ghost" formAction={unpublishEvent} data-confirm="unpublish">Move back to draft</button>}
        {event && event.status !== "cancelled" && <button className="btn danger" formAction={cancelEvent} data-confirm="cancel">Cancel event</button>}
      </div>
      <ConfirmSave />
    </form>
  );
}
