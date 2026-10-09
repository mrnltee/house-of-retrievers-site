"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";
import Footer from "./Footer";
import JoinModal from "./JoinModal";
import { HOME_URL, SOCIAL_PROFILES } from "../lib/siteSeo.mjs";

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

/** "2026-10-11" → "Sun, 11 Oct 2026", read as a calendar date (no timezone drift). */
function formatDate(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("en-PH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function EventCard({ event, past = false }) {
  const time = [event.startTime, event.endTime].filter(Boolean).join("–");
  const status = past ? "past" : event.status;

  return (
    <li className="event-card">
      {event.image && <img src={event.image} alt={event.imageAlt || ""} loading="lazy" />}
      <div className="event-card-body">
        <p className="event-badges">
          <span className={`event-status status-${status}`}>{past ? "Past event" : STATUS_LABELS[event.status]}</span>
          {!past && event.cost && <span className="event-cost">{event.cost}</span>}
        </p>
        <p className="event-category">{event.category}</p>
        <h3>{event.title}</h3>
        <dl className="event-meta">
          <div>
            <dt>When</dt>
            <dd>
              <time dateTime={event.date}>{formatDate(event.date)}</time>
              {time && ` · ${time}`}
            </dd>
          </div>
          <div>
            <dt>Where</dt>
            <dd>{event.venue}, {event.city}</dd>
          </div>
          {event.supports && (
            <div>
              <dt>For</dt>
              <dd>{event.supports}</dd>
            </div>
          )}
        </dl>
        {event.summary && <p className="event-summary">{event.summary}</p>}
      </div>
    </li>
  );
}

export default function EventsView({ upcoming, past }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [interest, setInterest] = useState("Member");

  useEffect(() => {
    document.body.style.overflow = joinOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [joinOpen]);

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
            <img className="brand-logo" src="/house-of-retrievers-logo-reverse.png" alt="House of Retrievers — Paws for a Purpose" width="1396" height="564" fetchPriority="high" />
          </span>
        </a>

        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation" aria-expanded={menuOpen}>
          <Icon name={menuOpen ? "close" : "menu"} />
        </button>

        <nav className={menuOpen ? "nav open" : "nav"} aria-label="Primary navigation">
          <a href={`${HOME_URL}/#mission`}>Our purpose</a>
          <a href={`${HOME_URL}/#pack`}>The pack</a>
          <a href="#main" className="nav-current" aria-current="page" onClick={() => setMenuOpen(false)}>Events</a>
          <a className="nav-support" href={`${HOME_URL}/#pack`}>Support the pack</a>
          <button className="nav-cta" onClick={() => openJoin()}>Join the pack <Icon name="arrow" size={16} /></button>
        </nav>
      </header>

      <main id="main">
        <section className="events-hero" aria-labelledby="events-title">
          <p className="eyebrow light">Events</p>
          <h1 id="events-title">Days we show up <em>together.</em></h1>
          <p>Runs, workshops, care visits and fundraisers. Each one lists the date, the place and who it supports before you come along.</p>
        </section>

        <section className="events-list" aria-labelledby="upcoming-title">
          <h2 id="upcoming-title">Coming up</h2>
          {upcoming.length > 0 ? (
            <ul className="event-grid">
              {upcoming.map((event) => <EventCard key={event.slug} event={event} />)}
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
              {past.map((event) => <EventCard key={event.slug} event={event} past />)}
            </ul>
          </section>
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

      {joinOpen && <JoinModal interest={interest} setInterest={setInterest} onClose={() => setJoinOpen(false)} />}
    </>
  );
}
