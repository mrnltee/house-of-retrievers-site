"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";
import LogoMoments from "./LogoMoments";
import Footer from "./Footer";
import JoinModal from "./JoinModal";
import RsvpModal from "./RsvpModal";
import ShareMenu from "./ShareMenu";
import { HOME_URL, SOCIAL_PROFILES } from "../lib/siteSeo.mjs";
import { formatWhen } from "../lib/share.mjs";

const STATUS_LABELS = {
  open: "RSVP open",
  "few-left": "Few spots left",
  full: "Full · Waitlist open",
  "no-rsvp": "No RSVP needed",
  closed: "RSVP closed",
  cancelled: "Cancelled",
};

const INSTAGRAM_URL = SOCIAL_PROFILES.find((url) => url.includes("instagram"));
const FACEBOOK_URL = SOCIAL_PROFILES.find((url) => url.includes("facebook"));

/**
 * Event pages live at events.…/<slug>; on previews and localhost the events
 * routes sit under /events. Known only in the browser, so links start at the
 * subdomain form and are corrected after the first render.
 */
function useEventsBase() {
  const [base, setBase] = useState("");
  useEffect(() => {
    if (window.location.pathname === "/events" || window.location.pathname.startsWith("/events/")) setBase("/events");
  }, []);
  return base;
}

/** Long summaries are cut on the card and shown in full on the event page. */
const isLong = (summary = "") => summary.length > 220 || summary.includes("\n");

function Hashtags({ tags }) {
  if (!tags?.length) return null;
  return (
    <ul className="event-tags" aria-label="Hashtags">
      {tags.map((tag) => <li key={tag}>#{tag}</li>)}
    </ul>
  );
}

function Meta({ event }) {
  return (
    <dl className="event-meta">
      <div>
        <dt>When</dt>
        <dd><time dateTime={event.date}>{formatWhen(event)}</time></dd>
      </div>
      <div>
        <dt>Where</dt>
        <dd>
          {event.venue}, {event.city}
          {event.directions && (
            <>
              {" "}
              <a className="event-directions" href={event.directions} target="_blank" rel="noopener noreferrer">
                <Icon name="pin" size={14} /> Get directions<span className="visually-hidden"> to {event.venue} (opens Google Maps)</span>
              </a>
            </>
          )}
        </dd>
      </div>
      {event.supports && (
        <div>
          <dt>For</dt>
          <dd>{event.supports}</dd>
        </div>
      )}
    </dl>
  );
}

function Badges({ event, past }) {
  const status = past ? "past" : event.status;
  return (
    <p className="event-badges">
      <span className={`event-status status-${status}`}>{past ? "Past event" : STATUS_LABELS[event.status]}</span>
      {!past && event.cost && <span className="event-cost">{event.cost}</span>}
      {event.purpose && <span className="event-purpose">{event.purpose}</span>}
    </p>
  );
}

function RsvpButton({ event, past, onRsvp }) {
  if (past || !event.rsvp || !["open", "few-left", "full"].includes(event.status)) return null;
  return (
    <button type="button" className="button primary event-rsvp" onClick={() => onRsvp(event)}>
      {event.status === "full" ? "Join the waitlist" : "RSVP"} <Icon name="arrow" size={16} />
    </button>
  );
}

function EventCard({ event, past = false, onRsvp, base }) {
  const href = `${base}/${event.slug}`;
  return (
    <li className="event-card">
      {event.image && <img src={event.image} alt={event.imageAlt || ""} loading="lazy" />}
      <div className="event-card-body">
        <Badges event={event} past={past} />
        <p className="event-category">{event.category}</p>
        <h3><a className="event-title-link" href={href}>{event.title}</a></h3>
        <Meta event={event} />
        {event.summary && <p className="event-summary event-summary-clamp">{event.summary}</p>}
        {event.summary && isLong(event.summary) && (
          <a className="event-more" href={href}>Read more<span className="visually-hidden"> about {event.title}</span></a>
        )}
        <Hashtags tags={event.hashtags} />
        <div className="event-actions">
          <RsvpButton event={event} past={past} onRsvp={onRsvp} />
          {!past && <ShareMenu event={event} />}
        </div>
      </div>
    </li>
  );
}

function mapEmbed(lat, lng) {
  const d = 0.004;
  const bbox = [lng - d * 1.6, lat - d, lng + d * 1.6, lat + d].map((n) => n.toFixed(5)).join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
}

function EventDetail({ event, past, onRsvp, base }) {
  return (
    <article className="event-detail" aria-labelledby="event-title">
      <a className="event-back" href={base ? `${base}` : "/"}>← All events</a>
      {event.image && <img className="event-detail-photo" src={event.image} alt={event.imageAlt || ""} />}
      <div className="event-detail-body">
        <Badges event={event} past={past} />
        <p className="event-category">{event.category}</p>
        <h1 id="event-title">{event.title}</h1>
        <Meta event={event} />
        {event.summary && <div className="event-summary event-summary-full">{event.summary}</div>}
        <Hashtags tags={event.hashtags} />
        <div className="event-actions">
          <RsvpButton event={event} past={past} onRsvp={onRsvp} />
          {!past && <ShareMenu event={event} />}
        </div>
        {Number.isFinite(event.venueLat) && Number.isFinite(event.venueLng) && (
          <iframe
            className="event-map"
            title={`Map of ${event.venue}`}
            src={mapEmbed(event.venueLat, event.venueLng)}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}
      </div>
    </article>
  );
}

export default function EventsView({ upcoming, past, focus = null }) {
  const base = useEventsBase();
  const [menuOpen, setMenuOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [interest, setInterest] = useState("Member");
  const [rsvpEvent, setRsvpEvent] = useState(null);

  useEffect(() => {
    document.body.style.overflow = joinOpen || rsvpEvent ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [joinOpen, rsvpEvent]);

  useEffect(() => {
    if (!joinOpen) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setJoinOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [joinOpen]);

  const openJoin = (nextInterest = "Member") => {
    setMenuOpen(false);
    setInterest(nextInterest);
    setJoinOpen(true);
  };

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>

      <header className="site-header">
        <a href={HOME_URL} className="brand" aria-label="House of Retrievers home">
          <span className="brand-logo-frame">
            <LogoMoments className="brand-logo" tone="dark" priority />
          </span>
        </a>

        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation" aria-expanded={menuOpen}>
          <Icon name={menuOpen ? "close" : "menu"} />
        </button>

        <nav className={menuOpen ? "nav open" : "nav"} aria-label="Primary navigation">
          <a href={`${HOME_URL}/#mission`}>Our purpose</a>
          <a href={`${HOME_URL}/#pack`}>The pack</a>
          <a href={focus ? base || "/" : "#main"} className="nav-current" aria-current="page" onClick={() => setMenuOpen(false)}>Events</a>
          <a className="nav-support" href={`${HOME_URL}/#pack`}>Support the pack</a>
          <button className="nav-cta" onClick={() => openJoin()}>Join the pack <Icon name="arrow" size={16} /></button>
        </nav>
      </header>

      <main id="main">
        {focus ? (
          <div className="event-detail-wrap">
            <EventDetail event={focus.event} past={focus.past} onRsvp={setRsvpEvent} base={base} />
          </div>
        ) : (
          <>
        <section className="events-hero" aria-labelledby="events-title">
          <p className="eyebrow light">Events</p>
          <h1 id="events-title">Days we show up <em>together.</em></h1>
          <p>Runs, workshops, care visits and fundraisers. Each one lists the date, the place and who it supports before you come along.</p>
        </section>

        <section className="events-list" aria-labelledby="upcoming-title">
          <h2 id="upcoming-title">Coming up</h2>
          {upcoming.length > 0 ? (
            <ul className="event-grid">
              {upcoming.map((event) => <EventCard key={event.slug} event={event} onRsvp={setRsvpEvent} base={base} />)}
            </ul>
          ) : (
            <div className="events-empty">
              <h3>No events on the calendar yet.</h3>
              <p>New dates go up on Instagram and Facebook first.</p>
              <div className="events-empty-actions">
                <a className="button primary" href={INSTAGRAM_URL} target="_blank" rel="noreferrer">Follow on Instagram</a>
                <a className="button events-button-outline" href={FACEBOOK_URL} target="_blank" rel="noreferrer">Follow on Facebook</a>
              </div>
            </div>
          )}
        </section>

        {past.length > 0 && (
          <section className="events-list events-past" aria-labelledby="past-title">
            <h2 id="past-title">Where we have been</h2>
            <ul className="event-grid">
              {past.map((event) => <EventCard key={event.slug} event={event} past base={base} />)}
            </ul>
          </section>
        )}

          </>
        )}

        <section className="events-partner" aria-labelledby="partner-title">
          <div>
            <h2 id="partner-title">Want to host or sponsor an event with us?</h2>
            <p>Tell us about your space, your cause, or what you would like to support.</p>
          </div>
          <button className="button events-button-dark" onClick={() => openJoin("Partner")}>Talk to us <Icon name="arrow" size={16} /></button>
        </section>
      </main>

      <Footer />

      {rsvpEvent && <RsvpModal event={rsvpEvent} onClose={() => setRsvpEvent(null)} />}
      {joinOpen && <JoinModal interest={interest} setInterest={setInterest} onClose={() => setJoinOpen(false)} />}
    </>
  );
}
