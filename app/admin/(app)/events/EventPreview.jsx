"use client";

import { manilaInstant } from "../../../lib/rsvpOpens.mjs";

import { useRef, useState } from "react";
import { EventCard, EventDetailPage } from "../../../components/EventsView";
import { isPastDate, parseHashtags, toPublicEvent } from "../../../lib/admin/events.mjs";
import { cleanTiers } from "../../../lib/prices.mjs";

const json = (text, fallback) => {
  try {
    return JSON.parse(text || "");
  } catch {
    return fallback;
  }
};

/**
 * The event as the form has it right now, in the shape the public page reads.
 * Nothing is saved: new photos are the ones prepared in the browser.
 */
function draftEvent(form, saved) {
  const f = new FormData(form);
  const get = (name) => (typeof f.get(name) === "string" ? f.get(name).trim() : "");
  const removed = get("imageRemove");
  const newCrop = get("imageData");
  const image = removed ? "" : newCrop || saved.image || "";
  const source = removed ? "" : newCrop ? get("imageSourceData") || get("imageSource") || newCrop : saved.imageSource || "";
  const pricingBasis = get("pricingBasis") || "registration";
  const tiers = cleanTiers(get("priceTiers") || "[]", { pricingBasis }).tiers || [];
  const lat = Number(get("venueLat"));
  const lng = Number(get("venueLng"));
  const hasPin = get("venueLat") !== "" && Number.isFinite(lat) && Number.isFinite(lng);
  const date = get("date") || new Date().toISOString().slice(0, 10);
  const row = {
    slug: get("slug") || saved.slug || "preview",
    title: get("title") || "Untitled event",
    category: get("category"),
    date,
    all_day: f.get("allDay") === "on",
    start_time: get("startTime"),
    end_time: get("endTime"),
    partners: json(get("partners"), []),
    sponsors: json(get("sponsors"), []),
    venue: get("venue") || "Venue to be announced",
    city: get("city"),
    venue_address: get("venueAddress"),
    included: get("included").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 10),
    cost: get("cost"),
    price_tiers: tiers,
    is_charity: f.get("isCharity") === "on",
    supports: get("supports"),
    purpose: get("purpose"),
    summary: get("summary"),
    hashtags: parseHashtags(get("hashtags")),
    venue_lat: hasPin ? lat : null,
    venue_lng: hasPin ? lng : null,
    map_url: get("mapUrl"),
    image,
    image_source: source,
    image_alt: get("imageAlt"),
    image_fit: get("imageFit"),
    gallery: json(get("gallery"), []),
    registration: f.get("registration") === "required" ? "required" : "none",
    capacity: get("capacity") ? Number(get("capacity")) : null,
    rsvp_open: f.get("rsvpOpen") === "on",
    rsvp_label: get("rsvpLabel"),
    vaccination_record_required: f.get("vaccinationRecordRequired") === "on",
    rsvp_form_config: json(get("rsvpFormConfig"), {}),
    rsvp_opens_at: f.get("rsvpOpensOn") === "on" ? manilaInstant(get("rsvpOpensDate"), get("rsvpOpensTime")) : null,
    fee_required: f.get("feeRequired") === "on",
    onsite_payment: f.get("onsitePayment") === "on",
    pricing_basis: pricingBasis,
    included_furbabies_per_human: Number(get("includedFurbabiesPerHuman") || 0),
    additional_furbaby_fee: Number(get("additionalFurbabyFee") || 0),
    status: "published",
  };
  return { event: toPublicEvent(row, 0), past: isPastDate(date) };
}

/**
 * "Preview" in the editor's save bar: the event page and its card exactly as
 * the public site draws them, from what's in the form now, at desktop or
 * phone width. Links and buttons inside are inert.
 */
export default function EventPreview({ image = "", imageSource = "", slug = "" }) {
  const anchor = useRef(null);
  const dialog = useRef(null);
  const [draft, setDraft] = useState(null);
  const [view, setView] = useState("page");
  const [width, setWidth] = useState("desktop");

  function open() {
    const form = anchor.current?.closest("form");
    if (!form) return;
    setDraft(draftEvent(form, { image, imageSource, slug }));
    dialog.current?.showModal();
  }

  return (
    <>
      <button type="button" className="btn ghost" ref={anchor} onClick={open}>Preview</button>
      <dialog ref={dialog} className="preview-dialog" aria-label="Preview of the event page">
        <div className="preview-bar">
          <div className="segmented small" role="tablist" aria-label="What to preview">
            <button type="button" role="tab" aria-selected={view === "form"} className={view === "form" ? "is-on" : undefined} onClick={() => setView("form")}>RSVP form</button>
            {[["page", "Event page"], ["card", "Card in the list"]].map(([key, label]) => (
              <button key={key} type="button" role="tab" aria-selected={view === key} className={view === key ? "is-on" : undefined} onClick={() => setView(key)}>{label}</button>
            ))}
          </div>
          <div className="segmented small" aria-label="Screen width">
            {[["desktop", "Desktop"], ["phone", "Phone"]].map(([key, label]) => (
              <button key={key} type="button" aria-pressed={width === key} className={width === key ? "is-on" : undefined} onClick={() => setWidth(key)}>{label}</button>
            ))}
          </div>
          <span className="small muted preview-note">Not saved yet. This is how it will look.</span>
          <button type="button" className="btn small" onClick={() => dialog.current?.close()} autoFocus>Back to editing</button>
        </div>
        {draft && (
          <div className="preview-stage">
            <div
              className={`preview-canvas is-${width} is-${view}`}
              // Links, RSVP and sharing do nothing in a preview.
              onClickCapture={(e) => {
                if (e.target.closest("a, .event-rsvp, .share-toggle")) e.preventDefault();
              }}
            >
              {view === "form" ? (
                <div className="preview-form-card"><p className="eyebrow">RSVP form</p><h2>{draft.event.title}</h2><p className="small muted">This is the order participants will see. Required fields are marked.</p><RsvpFormPreview config={draft.event.rsvpFormConfig} vaccination={draft.event.vaccinationRecordRequired} /></div>
              ) : view === "page" ? (
                <EventDetailPage event={draft.event} past={draft.past} photos={[]} onRsvp={() => {}} base="" />
              ) : (
                <ul className="event-grid preview-card">
                  <EventCard event={draft.event} past={draft.past} onRsvp={() => {}} base="" />
                </ul>
              )}
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}

function RsvpFormPreview({ config, vaccination }) {
  const optional = config?.optional || ["photoConsent", "under18"];
  const labels = { identity: ["Name, email and furbaby name", true], attendees: ["Hoomans and furbabies", true], photoConsent: ["Photo consent", false], under18: ["Age and guardian", false], vaccination: ["Vaccination record photo", false] };
  return <ol className="rsvp-preview-list">{(config?.order || ["identity", "attendees", "photoConsent", "under18", "vaccination"]).filter((key) => (key === "identity" || key === "attendees" || optional.includes(key)) && (key !== "vaccination" || vaccination)).map((key) => <li key={key}><span>{labels[key][0]}</span><small>{labels[key][1] ? "Required" : "Optional"}</small></li>)}</ol>;
}
