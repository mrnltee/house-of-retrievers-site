"use client";

import { manilaInstant } from "../../../lib/rsvpOpens.mjs";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EventCard, EventDetailPage } from "../../../components/EventsView";
import RsvpModal from "../../../components/RsvpModal";
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
    capacity_basis: get("capacityBasis") || "registration",
    rsvp_open: f.get("rsvpOpen") === "on",
    rsvp_label: get("rsvpLabel"),
    vaccination_record_required: f.get("vaccinationRecordRequired") === "on",
    rsvp_form_config: json(get("rsvpFormConfig"), {}),
    tiers_in_order: f.get("tiersInOrder") === "on",
    tiers_hide_later: f.get("tiersHideLater") === "on",
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
  // The dialog lives outside the event form (a portal to <body>): the RSVP form preview is a real <form>, and forms can't nest.
  const [host, setHost] = useState(null);
  useEffect(() => setHost(document.body), []);
  const [view, setView] = useState("page");
  const [width, setWidth] = useState("desktop");
  // While RSVPs open later, registrants see a countdown; "Once RSVPs open" shows the page as it will be after.
  const [stage, setStage] = useState("now");
  const scheduled = draft?.event.status === "soon";
  const shown = draft && scheduled && stage === "open" ? { ...draft, event: { ...draft.event, status: draft.event.openStatus, rsvpOpensAt: undefined } } : draft;

  function open() {
    const form = anchor.current?.closest("form");
    if (!form) return;
    setDraft(draftEvent(form, { image, imageSource, slug }));
    dialog.current?.showModal();
  }

  return (
    <>
      <button type="button" className="btn ghost" ref={anchor} onClick={open}>Preview</button>
      {host && createPortal(<dialog ref={dialog} className="preview-dialog admin" aria-label="Preview of the event page">
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
          {scheduled && view !== "form" && (
            <div className="segmented small" aria-label="When">
              {[["now", "Before RSVPs open"], ["open", "Once RSVPs open"]].map(([key, label]) => (
                <button key={key} type="button" aria-pressed={stage === key} className={stage === key ? "is-on" : undefined} onClick={() => setStage(key)}>{label}</button>
              ))}
            </div>
          )}
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
                <RsvpModal event={shown.event} onClose={() => {}} preview />
              ) : view === "page" ? (
                <EventDetailPage event={shown.event} past={shown.past} photos={[]} onRsvp={() => {}} base="" />
              ) : (
                <ul className="event-grid preview-card">
                  <EventCard event={shown.event} past={shown.past} onRsvp={() => {}} base="" />
                </ul>
              )}
            </div>
          </div>
        )}
      </dialog>, host)}
    </>
  );
}
