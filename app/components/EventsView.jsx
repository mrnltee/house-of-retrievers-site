"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import LogoMoments from "./LogoMoments";
import Footer from "./Footer";
import JoinModal from "./JoinModal";
import RsvpModal from "./RsvpModal";
import ShareMenu from "./ShareMenu";
import { HOME_URL, SOCIAL_PROFILES } from "../lib/siteSeo.mjs";
import { eventUrl, formatWhen } from "../lib/share.mjs";
import { googleCalendarUrl, icsFile } from "../lib/calendar.mjs";
import { formatPeso } from "../lib/prices.mjs";
import { linkify } from "../lib/linkify.mjs";
import { countdownParts, formatOpens } from "../lib/rsvpOpens.mjs";

const STATUS_LABELS = {
  open: "RSVP open",
  "few-left": "Few spots left",
  full: "Full · Waitlist open",
  "no-rsvp": "No RSVP needed",
  closed: "RSVP closed",
  soon: "RSVP opens soon",
  cancelled: "Cancelled",
};

/**
 * An event whose RSVPs open at a set time has status "soon" until then. In
 * the browser it switches to its open status (open / few left / full) the
 * moment the countdown ends, without a reload; the server checks the time too.
 */
function useLiveEvent(event) {
  const opensAt = event.status === "soon" ? Date.parse(event.rsvpOpensAt || "") : NaN;
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!Number.isFinite(opensAt)) return undefined;
    let timer;
    const check = () => {
      const left = opensAt - Date.now();
      if (left <= 0) return setOpen(true);
      timer = setTimeout(check, Math.min(left, 2 ** 31 - 1));
    };
    check();
    return () => clearTimeout(timer);
  }, [opensAt]);
  return open ? { ...event, status: event.openStatus || "open" } : event;
}

const pad2 = (n) => String(n).padStart(2, "0");

/** Google Calendar reminder for the moment RSVPs open (15 minutes long). */
function reminderUrl(event) {
  const start = new Date(event.rsvpOpensAt);
  const stamp = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `RSVP opens: ${event.title}`,
    dates: `${stamp(start)}/${stamp(new Date(start.getTime() + 15 * 60 * 1000))}`,
    details: `RSVPs for ${event.title} open now. ${eventUrl(event.slug)}`,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

/**
 * The countdown that stands in for the RSVP button until RSVPs open. The
 * digits tick every second (hidden from screen readers, which get the
 * opening time once instead of a reading every second).
 */
function RsvpCountdown({ event, compact = false }) {
  const opensAt = Date.parse(event.rsvpOpensAt || "");
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);
  const when = formatOpens(event.rsvpOpensAt);
  const { days, hours, minutes, seconds } = countdownParts(now == null ? 0 : opensAt - now);
  return (
    <div className={`event-countdown${compact ? " is-compact" : ""}`} role="timer" aria-label={`RSVPs open ${when}, Manila time`}>
      <span className="event-countdown-label" aria-hidden="true">RSVP opens in</span>
      <span className="event-countdown-digits" aria-hidden="true">
        {now == null ? <span className="event-countdown-when">{when}</span> : (
          <>
            {days > 0 && <span><strong>{days}</strong><small>d</small></span>}
            <span><strong>{pad2(hours)}</strong><small>h</small></span>
            <span><strong>{pad2(minutes)}</strong><small>m</small></span>
            <span><strong>{pad2(seconds)}</strong><small>s</small></span>
          </>
        )}
      </span>
      {!compact && <span className="event-countdown-foot" aria-hidden="true">{when} · <a href={reminderUrl(event)} target="_blank" rel="noreferrer">Remind me</a></span>}
    </div>
  );
}

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

function Hashtags({ tags }) {
  if (!tags?.length) return null;
  return (
    <ul className="event-tags" aria-label="Hashtags">
      {tags.map((tag) => <li key={tag}>#{tag}</li>)}
    </ul>
  );
}

/** Event text with its web links and emails clickable; web links open in a new tab. */
function Linked({ text }) {
  return linkify(text).map((part, i) =>
    typeof part === "string" ? (
      part
    ) : part.email ? (
      <a key={i} href={part.href} className="event-link">{part.text}</a>
    ) : (
      <a key={i} href={part.href} className="event-link" target="_blank" rel="noopener noreferrer">{part.text}</a>
    ),
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

function RsvpButton({ event, past, onRsvp, compact = false }) {
  if (!past && event.rsvp && event.status === "soon") return <RsvpCountdown event={event} compact={compact} />;
  if (past || !event.rsvp || !["open", "few-left", "full"].includes(event.status)) return null;
  return (
    <button type="button" className="button primary event-rsvp" onClick={() => onRsvp(event)}>
      {event.status === "full" ? "Join the waitlist" : "RSVP"} <Icon name="arrow" size={16} />
    </button>
  );
}

/** "2026-10-17" → { day: "17", month: "Oct", weekday: "Sat" } (the date as written, no time zone shift). */
function dateParts(iso) {
  const [y, m, d] = String(iso || "").slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  const part = (o) => new Intl.DateTimeFormat("en-US", { ...o, timeZone: "UTC" }).format(date);
  return { day: String(d).padStart(2, "0"), month: part({ month: "short" }), weekday: part({ weekday: "short" }), year: y };
}

/** "1:00–4:00 PM", "All day", or "" */
function timeLine(event) {
  if (event.allDay) return "All day";
  const when = formatWhen(event);
  const dot = when.indexOf(" · ");
  return dot >= 0 ? when.slice(dot + 3) : "";
}

/** RSVP opens later: a short, quiet countdown in the RSVP slot (minutes, then seconds in the last hour). */
function OpensPill({ event }) {
  const opensAt = Date.parse(event.rsvpOpensAt || "");
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);
  const when = formatOpens(event.rsvpOpensAt);
  const { days, hours, minutes, seconds } = countdownParts(now == null ? 0 : opensAt - now);
  const short = now == null ? "Opens soon"
    : days > 0 ? `Opens in ${days}d ${pad2(hours)}h`
      : hours > 0 ? `Opens in ${hours}h ${pad2(minutes)}m`
        : `Opens in ${minutes}m ${pad2(seconds)}s`;
  return (
    <span className="event-opens-pill" role="timer" aria-label={`RSVPs open ${when}, Manila time`}>
      <span aria-hidden="true">{short}</span>
    </span>
  );
}

/**
 * The compact card (Figma "Event card — compact", 12 Oct 2026): poster with
 * the date tile and availability, event type, title, time, place and price,
 * then View details and RSVP. Everything else is on the event page.
 */
export function EventCard({ event: given, past = false, onRsvp, base }) {
  const event = useLiveEvent(given);
  const href = `${base}/${event.slug}`;
  const date = dateParts(event.date);
  const time = timeLine(event);
  const showRsvp = !past && event.rsvp && ["open", "few-left", "full"].includes(event.status);
  return (
    <li className={`event-card is-compact${past ? " is-past" : ""}`}>
      <a className={`event-card-media${event.image ? "" : " no-image"}`} href={href} tabIndex={-1} aria-hidden="true">
        {event.image && <img src={event.image} alt="" loading="lazy" />}
        {date && (
          <span className="event-date-tile">
            <strong>{date.day}</strong>
            <span>{date.month}</span>
            {past && <em>{date.year}</em>}
          </span>
        )}
        <span className={`event-status status-${past ? "past" : event.status}`}>{past ? "Past event" : STATUS_LABELS[event.status]}</span>
      </a>
      <div className="event-card-body">
        {event.category && <p className="event-category">{event.category}</p>}
        <h3><a className="event-title-link" href={href}>{event.title}</a></h3>
        <ul className="event-card-facts">
          <li>
            <Icon name="calendar" size={14} />
            <span>
              <time dateTime={event.date}>{date ? <>{date.weekday}<span className="visually-hidden">, {date.month} {Number(date.day)}, {date.year}</span></> : event.date}</time>
              {time ? ` · ${time}` : ""}
            </span>
          </li>
          <li><Icon name="pin" size={14} /> <span>{[event.venue, event.city].filter(Boolean).join(", ")}</span></li>
        </ul>
        {past ? (
          <a className="event-more" href={href}>See the recap<span className="visually-hidden"> of {event.title}</span> →</a>
        ) : (
          <div className="event-card-footer">
            <Price event={event} past={past} />
            <div className="event-card-actions">
              <a className="button events-button-outline event-view" href={href}>View details<span className="visually-hidden"> of {event.title}</span></a>
              {showRsvp && <RsvpButton event={event} past={past} onRsvp={onRsvp} />}
              {!past && event.rsvp && event.status === "soon" && <OpensPill event={event} />}
            </div>
          </div>
        )}
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
 * The event's pictures in one 4:5 frame, each as its fill says: whole (Fit),
 * filling the frame (Fill) or repeated (Tile). Wide screens get arrows and
 * thumbnails, narrow ones dots and swipe; arrow keys work once it has focus.
 */
function EventMedia({ media, title }) {
  const [index, setIndex] = useState(0);
  const touch = useRef(null);
  const count = media.length;
  const step = (d) => setIndex((i) => (i + d + count) % count);
  return (
    <section
      className="event-media-wrap"
      aria-roledescription={count > 1 ? "carousel" : undefined}
      aria-label={count > 1 ? `${title} photos` : undefined}
    >
      <div
        className="event-media"
        tabIndex={count > 1 ? 0 : undefined}
        onKeyDown={(e) => {
          if (count < 2) return;
          if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
          if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
        }}
        onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - (touch.current ?? 0);
          if (count > 1 && Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
        }}
      >
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
            <div className="event-media-dots" aria-hidden="true">
              {media.map((item, i) => <span key={item.src} className={i === index ? "active" : undefined} />)}
            </div>
          </>
        )}
      </div>
      {count > 1 && (
        <div className="event-media-thumbs">
          {media.map((item, i) => (
            <button key={item.src} type="button" className={i === index ? "active" : undefined} aria-label={`Photo ${i + 1} of ${count}`} aria-current={i === index} onClick={() => setIndex(i)}>
              <img src={item.src} alt="" loading="lazy" decoding="async" />
            </button>
          ))}
          <span className="event-media-count" aria-live="polite">{index + 1} / {count}</span>
        </div>
      )}
    </section>
  );
}

/** Google Calendar, or a calendar file for Apple Calendar, Outlook and most phones. */
function AddToCalendar({ event }) {
  const url = eventUrl(event.slug);
  const menu = useRef(null);
  // Closes like any menu: Escape, or a tap anywhere else.
  useEffect(() => {
    const close = (e) => {
      const el = menu.current;
      if (!el?.open) return;
      if (e.type === "keydown" ? e.key === "Escape" : !el.contains(e.target)) {
        el.open = false;
        if (e.type === "keydown") el.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, []);
  function download() {
    const blob = new Blob([icsFile(event, url)], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${event.slug}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }
  return (
    <details className="event-calendar" ref={menu}>
      <summary className="event-chip"><Icon name="calendar" size={16} /> Add to calendar</summary>
      <div className="event-calendar-menu">
        <a href={googleCalendarUrl(event, url)} target="_blank" rel="noopener noreferrer">Google Calendar</a>
        <button type="button" onClick={() => { download(); if (menu.current) menu.current.open = false; }}>Apple, Outlook or other (.ics file)</button>
      </div>
    </details>
  );
}

/** When, where, who it's for and the price tiers, each fact on its own line. */
function DetailFacts({ event, past }) {
  const cityShown = event.city && !event.venue?.toLowerCase().includes(event.city.toLowerCase());
  const placeLine = [event.venueAddress, cityShown ? event.city : ""].filter(Boolean).join(", ");
  return (
    <dl className="event-facts">
      <div>
        <dt>When</dt>
        <dd>
          <time dateTime={event.date} className="event-fact-main">{formatWhen(event)}</time>
          {!past && <AddToCalendar event={event} />}
        </dd>
      </div>
      <div>
        <dt>Where</dt>
        <dd>
          <span className="event-fact-main">{event.venue}</span>
          {placeLine && <span className="event-fact-sub">{placeLine}</span>}
          {event.directions && (
            <span className="event-chips">
              <a className="event-chip" href={event.directions} target="_blank" rel="noopener noreferrer">
                <Icon name="pin" size={16} /> Get directions<span className="visually-hidden"> to {event.venue} (opens Google Maps)</span>
              </a>
              {!past && event.parking && (
                <a className="event-chip" href={event.parking} target="_blank" rel="noopener noreferrer">
                  <Icon name="parking" size={16} /> Parking nearby<span className="visually-hidden"> around {event.venue} (opens Google Maps)</span>
                </a>
              )}
            </span>
          )}
        </dd>
      </div>
      {event.supports && (
        <div>
          <dt>For</dt>
          <dd><span className="event-fact-main">{event.supports}</span></dd>
        </div>
      )}
      {!past && event.priceTiers && (
        <div>
          <dt>Price</dt>
          <dd>
            <ul className="event-tier-table">
              {event.priceTiers.map((tier, i) => (
                <li key={i} className={tier.ended ? "is-ended" : undefined}>
                  <span>{tier.label || "Ticket"}{tier.window && <small>{tier.window}</small>}</span>
                  <strong>{tier.amount === 0 ? "Free" : formatPeso(tier.amount)}</strong>
                </li>
              ))}
            </ul>
            {event.pricingBasis === "human_plus_furbaby" && <p className="small muted" style={{ margin: "8px 0 0" }}>Each human ticket includes {event.includedFurbabiesPerHuman || 0} furbabies. {event.additionalFurbabyFee ? `${formatPeso(event.additionalFurbabyFee)} for each additional furbaby.` : "Additional furbabies are not charged."}</p>}
          </dd>
        </div>
      )}
    </dl>
  );
}

/** A partner or sponsor on the event page: with a public record, its logo and a link to its panel on the home page. */
function SupporterChip({ name, link }) {
  if (!link) return <li>{name}</li>;
  return (
    <li className="has-logo">
      <a href={`${HOME_URL}/?supporter=${link.slug}#partners`}>
        <img src={link.logo} alt="" width={28} height={28} />
        {name}
        <Icon name="arrow" size={13} />
      </a>
    </li>
  );
}

export function EventDetail({ event: given, past, onRsvp, base, photos = [] }) {
  const event = useLiveEvent(given);
  const media = event.media || (event.image ? [{ src: event.image, alt: event.imageAlt || "" }] : []);
  const card = useRef(null);
  const [cardInView, setCardInView] = useState(true);
  const canRsvp = !past && event.rsvp && ["open", "few-left", "full", "soon"].includes(event.status);

  // The phone's bottom bar steps aside while the main RSVP card is on screen.
  useEffect(() => {
    if (!canRsvp || !card.current) return undefined;
    const observer = new IntersectionObserver(([entry]) => setCardInView(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(card.current);
    return () => observer.disconnect();
  }, [canRsvp]);

  const labels = [event.category, event.purpose].filter(Boolean).join("  ·  ");
  return (
    <article className="event-detail" aria-labelledby="event-title">
      <a className="event-back" href={base ? `${base}` : "/"}>← All events</a>
      <div className="event-detail-grid">
        <div className="event-detail-media">
          {media.length > 0 && <EventMedia media={media} title={event.title} />}
        </div>
        <div className="event-detail-body">
          <p className="event-badges">
            <span className={`event-status status-${past ? "past" : event.status}`}>{past ? "Past event" : STATUS_LABELS[event.status]}</span>
          </p>
          {labels && <p className="event-category">{labels}</p>}
          <h1 id="event-title">{event.title}</h1>
          <DetailFacts event={event} past={past} />
          {!past && (event.cost || canRsvp) && (
            <div className="event-action-card" ref={card}>
              <Price event={event} past={past} />
              <RsvpButton event={event} past={past} onRsvp={onRsvp} />
              <ShareMenu event={event} compact />
            </div>
          )}
          {!past && !event.cost && !canRsvp && <div className="event-actions"><ShareMenu event={event} /></div>}
          {event.summary && (
            <section className="event-about" aria-labelledby="about-title">
              <h2 id="about-title">About</h2>
              <div className="event-summary event-summary-full"><Linked text={event.summary} /></div>
            </section>
          )}
          {event.included && (
            <section className="event-included" aria-labelledby="included-title">
              <h3 id="included-title">What's included</h3>
              <ul>
                {event.included.map((item) => <li key={item}><Icon name="check" size={14} /> <span><Linked text={item} /></span></li>)}
              </ul>
            </section>
          )}
          {(event.partners || event.sponsors) && (
            <section className="event-supporters" aria-labelledby="supporters-title">
              <h3 id="supporters-title">With thanks to</h3>
              {event.partners && (
                <div>
                  <p className="event-supporters-role">In partnership with</p>
                  <ul>{event.partners.map((n) => <SupporterChip key={n} name={n} link={event.supporterLinks?.[n.toLowerCase()]} />)}</ul>
                </div>
              )}
              {event.sponsors && (
                <div>
                  <p className="event-supporters-role">Sponsored by</p>
                  <ul>{event.sponsors.map((n) => <SupporterChip key={n} name={n} link={event.supporterLinks?.[n.toLowerCase()]} />)}</ul>
                </div>
              )}
            </section>
          )}
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
          <Hashtags tags={event.hashtags} />
        </div>
      </div>
      {canRsvp && (
        <div className={`event-rsvp-bar${cardInView ? " is-hidden" : ""}`} inert={cardInView}>
          <Price event={event} past={past} />
          <RsvpButton event={event} past={past} onRsvp={onRsvp} compact />
        </div>
      )}
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
          <p>Runs, workshops, care visits and fundraisers. Each one shows the date, the place and the price; open it for the full story, then RSVP.</p>
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
