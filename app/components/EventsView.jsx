"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import LogoMoments from "./LogoMoments";
import Footer from "./Footer";
import JoinModal from "./JoinModal";
import RsvpModal from "./RsvpModal";
import ShareMenu from "./ShareMenu";
import { HOME_URL, SOCIAL_PROFILES } from "../lib/siteSeo.mjs";
import { formatWhen } from "../lib/share.mjs";
import { formatPeso } from "../lib/prices.mjs";

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

function Meta({ event, past = false, detail = false }) {
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
              {!past && event.parking && (
                <>
                  {" "}
                  <a className="event-directions" href={event.parking} target="_blank" rel="noopener noreferrer">
                    <Icon name="parking" size={14} /> Parking nearby<span className="visually-hidden"> around {event.venue} (opens Google Maps)</span>
                  </a>
                </>
              )}
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
      {detail && !past && event.priceTiers && (
        <div>
          <dt>Price</dt>
          <dd>
            <ul className="event-tiers">
              {event.priceTiers.map((tier, i) => (
                <li key={i}><span>{tier.label || "Ticket"}</span> <strong>{tier.amount === 0 ? "Free" : formatPeso(tier.amount)}</strong></li>
              ))}
            </ul>
          </dd>
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
      {event.purpose && <span className="event-purpose">{event.purpose}</span>}
    </p>
  );
}

/**
 * The price sits with the RSVP button, where people decide, not among the
 * labels. Cards show the range; the event page also lists every tier.
 */
function Price({ event, past }) {
  if (past || !event.cost) return null;
  return (
    <p className="event-price">
      <span className="event-price-label">Price</span>
      <span className="event-price-value">{event.cost}</span>
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

export function EventCard({ event, past = false, onRsvp, base }) {
  const href = `${base}/${event.slug}`;
  return (
    <li className="event-card">
      {event.image && <img src={event.image} alt={event.imageAlt || ""} loading="lazy" />}
      <div className="event-card-body">
        <Badges event={event} past={past} />
        <p className="event-category">{event.category}</p>
        <h3><a className="event-title-link" href={href}>{event.title}</a></h3>
        <Meta event={event} past={past} />
        {event.summary && <p className="event-summary event-summary-clamp">{event.summary}</p>}
        {event.summary && isLong(event.summary) && (
          <a className="event-more" href={href}>Read more<span className="visually-hidden"> about {event.title}</span></a>
        )}
        <Hashtags tags={event.hashtags} />
        <div className="event-actions event-card-footer">
          <Price event={event} past={past} />
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

/**
 * A past event's album: a grid, and a full-screen viewer with arrow keys,
 * swipe and Esc. Built on <dialog>, so focus stays inside while it's open.
 */
function EventAlbum({ photos, title }) {
  const dialog = useRef(null);
  const [index, setIndex] = useState(0);
  const touch = useRef(null);
  const open = (i) => {
    setIndex(i);
    dialog.current?.showModal();
  };
  const step = (d) => setIndex((i) => (i + d + photos.length) % photos.length);
  const photo = photos[index];
  return (
    <section className="event-album" aria-labelledby="album-title">
      <h2 id="album-title">Photos <span>{photos.length}</span></h2>
      <ul className="event-album-grid">
        {photos.map((p, i) => (
          <li key={p.thumb}>
            <button type="button" onClick={() => open(i)} aria-label={`Open photo ${i + 1} of ${photos.length}${p.alt ? `: ${p.alt}` : ""}`}>
              <img src={p.thumb} alt={p.alt} width={p.width} height={p.height} loading="lazy" decoding="async" />
            </button>
          </li>
        ))}
      </ul>
      <dialog
        ref={dialog}
        className="event-lightbox"
        aria-label={`${title} photos`}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
        onClick={(e) => { if (e.target === dialog.current) dialog.current.close(); }}
        onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - (touch.current ?? 0);
          if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
        }}
      >
        {photo && <img src={photo.full} alt={photo.alt} />}
        <p className="event-lightbox-count" aria-live="polite">{index + 1} / {photos.length}</p>
        {photos.length > 1 && (
          <>
            <button type="button" className="event-lightbox-prev" onClick={() => step(-1)} aria-label="Previous photo">‹</button>
            <button type="button" className="event-lightbox-next" onClick={() => step(1)} aria-label="Next photo">›</button>
          </>
        )}
        <button type="button" className="event-lightbox-close" onClick={() => dialog.current.close()} aria-label="Close photos"><Icon name="close" size={20} /></button>
      </dialog>
    </section>
  );
}

/**
 * The event's pictures, each shown whole (posters keep their text) on a
 * blurred copy of itself. Two or more: arrows, dots and swipe.
 */
function EventMedia({ media, title }) {
  const [index, setIndex] = useState(0);
  const touch = useRef(null);
  const count = media.length;
  const step = (d) => setIndex((i) => (i + d + count) % count);
  const current = media[index];
  return (
    <section
      className="event-media"
      aria-roledescription={count > 1 ? "carousel" : undefined}
      aria-label={count > 1 ? `${title} photos` : undefined}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - (touch.current ?? 0);
        if (count > 1 && Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
      }}
    >
      {(current.fit || "fit") === "fit" && <img className="event-media-backdrop" src={current.src} alt="" aria-hidden="true" />}
      {media.map((item, i) =>
        item.fit === "tile" ? (
          <div
            key={item.src}
            className={`event-media-photo is-tile${i === index ? " is-active" : ""}`}
            style={{ backgroundImage: `url("${item.src}")` }}
            role="img"
            aria-label={i === index ? item.alt || "" : undefined}
            aria-hidden={i !== index}
          />
        ) : (
          <img
            key={item.src}
            className={`event-media-photo${item.fit === "fill" ? " is-fill" : ""}${i === index ? " is-active" : ""}`}
            src={item.src}
            alt={i === index ? item.alt || "" : ""}
            aria-hidden={i !== index}
            loading={i === 0 ? "eager" : "lazy"}
            decoding="async"
          />
        ),
      )}
      {count > 1 && (
        <>
          <button type="button" className="event-media-prev" onClick={() => step(-1)} aria-label="Previous photo"><Icon name="arrow" size={18} /></button>
          <button type="button" className="event-media-next" onClick={() => step(1)} aria-label="Next photo"><Icon name="arrow" size={18} /></button>
          <div className="event-media-dots">
            {media.map((item, i) => (
              <button key={item.src} type="button" className={i === index ? "active" : undefined} aria-label={`Photo ${i + 1} of ${count}`} aria-current={i === index} onClick={() => setIndex(i)} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export function EventDetail({ event, past, onRsvp, base, photos = [] }) {
  const media = event.media || (event.image ? [{ src: event.image, alt: event.imageAlt || "" }] : []);
  return (
    <article className="event-detail" aria-labelledby="event-title">
      <a className="event-back" href={base ? `${base}` : "/"}>← All events</a>
      {media.length > 0 && <EventMedia media={media} title={event.title} />}
      <div className="event-detail-body">
        <Badges event={event} past={past} />
        <p className="event-category">{event.category}</p>
        <h1 id="event-title">{event.title}</h1>
        <Meta event={event} past={past} detail />
        <div className="event-actions event-detail-actions">
          <Price event={event} past={past} />
          <RsvpButton event={event} past={past} onRsvp={onRsvp} />
          {!past && <ShareMenu event={event} />}
        </div>
        {event.summary && <div className="event-summary event-summary-full">{event.summary}</div>}
        <Hashtags tags={event.hashtags} />
        {past && photos.length > 0 && <EventAlbum photos={photos} title={event.title} />}
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

/** The event page body: its blurred cover band behind the header, then the details. */
export function EventDetailPage({ event, past, photos, onRsvp, base }) {
  const band = event.media?.[0]?.src || event.image;
  return (
    <div className="event-detail-wrap">
      {band && (
        <div className="event-detail-backdrop" aria-hidden="true">
          <img src={band} alt="" />
        </div>
      )}
      <EventDetail event={event} past={past} photos={photos} onRsvp={onRsvp} base={base} />
    </div>
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
          <EventDetailPage event={focus.event} past={focus.past} photos={focus.photos} onRsvp={setRsvpEvent} base={base} />
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
