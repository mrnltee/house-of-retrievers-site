"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { socialLinks } from "../lib/socials.mjs";
import { gaveLine, totals } from "../lib/supporters.mjs";

const formatPeso = (n) => `₱${Number(n).toLocaleString("en-PH")}`;
const formatDate = (iso) => new Date(`${iso}T00:00:00+08:00`).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", weekday: "short", month: "short", day: "numeric", year: "numeric" });
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
const SLIDE_MIN = 3; // groups this size or bigger slide on their own; smaller ones stay still
const SLIDE_FILL = 8; // tiles in one loop, so the row never runs out of logos on a wide screen
const SECONDS_PER_TILE = 4;

function Tile({ supporter, big = false, onOpen, clone = false }) {
  // The latest event they were at; an upcoming one only when there's none yet (events come newest first).
  const now = today();
  const shown = supporter.events.find((e) => e.date < now) || supporter.events[0];
  return (
    <li inert={clone || undefined}>
      <button type="button" className={`supporter-tile${big ? " is-big" : ""}`} onClick={() => onOpen(supporter)} aria-haspopup="dialog">
        <span className="supporter-logo"><img src={supporter.logo} alt="" loading="lazy" /></span>
        <span className="supporter-name">{supporter.name}</span>
        {shown && <span className="supporter-event">{shown.date >= now ? "Joining" : "At"} {shown.title}{supporter.events.length > 1 ? ` +${supporter.events.length - 1} more` : ""}</span>}
      </button>
    </li>
  );
}

/**
 * A row of logos that slides on its own, left or right, and pauses on hover or focus.
 * The list repeats so the loop is seamless; repeats are hidden from screen readers
 * and the keyboard. With reduced motion it's a still wall of the real logos.
 */
function SupporterWall({ items, onOpen, label, direction = "left" }) {
  if (items.length < SLIDE_MIN) {
    return <ul className="supporter-wall" aria-label={`${label} logos`}>{items.map((s) => <Tile key={s.slug} supporter={s} onOpen={onOpen} />)}</ul>;
  }
  const loop = Array.from({ length: Math.ceil(SLIDE_FILL / items.length) }, () => items).flat();
  return (
    <div className={`supporter-slider is-${direction}`}>
      <ul className="supporter-track" aria-label={`${label} logos`} style={{ "--slide-duration": `${loop.length * SECONDS_PER_TILE}s` }}>
        {[...loop, ...loop].map((s, i) => <Tile key={`${s.slug}-${i}`} supporter={s} onOpen={onOpen} clone={i >= items.length} />)}
      </ul>
    </div>
  );
}

/** The panel a tile opens: blurb, what they gave, links, and the events they backed. */
function SupporterDialog({ supporter, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    const el = dialog.current;
    if (el && !el.open) el.showModal();
    const close = () => onClose();
    el?.addEventListener("close", close);
    return () => el?.removeEventListener("close", close);
  }, [onClose]);
  const now = today();
  const gave = gaveLine(supporter);
  return (
    <dialog ref={dialog} className="supporter-dialog" aria-labelledby="supporter-title" onClick={(e) => e.target === dialog.current && dialog.current.close()}>
      <div className="supporter-dialog-body">
        <div className="supporter-dialog-top">
          <span className="supporter-logo"><img src={supporter.logo} alt={`${supporter.name} logo`} /></span>
          <div>
            <p className="supporter-chips">
              <span className="supporter-chip">{supporter.kind}</span>
              {supporter.label && <span className="supporter-chip">{supporter.label}</span>}
              {supporter.tierLabel && <span className={`supporter-chip tier-${supporter.tier}`}>★ {supporter.tierLabel}</span>}
            </p>
            <h3 id="supporter-title">{supporter.name}</h3>
          </div>
          <button type="button" className="supporter-close" onClick={() => dialog.current.close()} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>
        <p className="supporter-blurb">{supporter.blurb}</p>
        {gave && <p className="supporter-gave">{gave}</p>}
        {socialLinks(supporter).length > 0 && (
          <p className="supporter-links">
            {socialLinks(supporter).map((l) => <a key={l.key} href={l.url} target="_blank" rel="noopener noreferrer">{l.label} <Icon name="external" size={13} /></a>)}
          </p>
        )}
        {supporter.events.length > 0 && (
          <div className="supporter-events">
            <p className="supporter-label">Events they joined</p>
            <ul>
              {supporter.events.map((e) => (
                <li key={e.slug}>
                  <a href={e.url}>
                    <span><strong>{e.title}</strong><small>{formatDate(e.date)}</small></span>
                    {e.date >= now && <span className="supporter-chip is-upcoming">Coming up</span>}
                    <Icon name="arrow" size={15} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </dialog>
  );
}

/**
 * "Brands that have joined our events" on the home page (Figma "Sponsors &
 * partners", W1/W2; reworded 1 Nov 2026, owner: no formal contracts yet, so it
 * says what each brand did at our events, not that they're official partners). Reads /api/supporters; with nothing public yet it renders nothing.
 * ?supporter=<slug> (links from event pages) opens that supporter's panel.
 */
export default function Supporters({ onJoin }) {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    let live = true;
    fetch("/api/supporters")
      .then((r) => (r.ok ? r.json() : { supporters: [] }))
      .then(({ supporters }) => {
        if (!live) return;
        setList(supporters || []);
        const wanted = new URLSearchParams(window.location.search).get("supporter");
        const match = wanted && (supporters || []).find((s) => s.slug === wanted);
        if (match) {
          setOpen(match);
          document.getElementById("partners")?.scrollIntoView();
        }
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const close = () => {
    setOpen(null);
    const params = new URLSearchParams(window.location.search);
    if (params.has("supporter")) {
      params.delete("supporter");
      const query = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
    }
  };

  if (!list.length) return null;
  const partners = list.filter((s) => s.kind === "Partner");
  const sponsors = list.filter((s) => s.kind === "Sponsor");
  const year = Math.max(0, ...sponsors.map((s) => s.year || 0));
  const sum = year ? totals(sponsors, year) : null;

  return (
    <section className="supporters section-shell" id="partners" aria-labelledby="partners-title">
      <div className="supporters-head">
        <p className="eyebrow">Paws for a purpose, together</p>
        <h2 id="partners-title">Brands that have <em>joined our events.</em></h2>
        <p className="supporters-lead">Our runs, care visits and fundraisers happened because these brands lent a venue, a camera, treats or prizes. Thank you.</p>
      </div>

      {partners.length > 0 && (
        <div className="supporters-group">
          <h3>Worked with us <small>Lent a venue, services or a hand</small></h3>
          <SupporterWall items={partners} onOpen={setOpen} label="Brands that worked with us" direction="right" />
        </div>
      )}

      {sponsors.length > 0 && (
        <div className="supporters-group">
          <h3>Supported our events <small>Gave funds, products or prizes</small></h3>
          <SupporterWall items={sponsors} onOpen={setOpen} label="Brands that supported our events" />
          {sum && (sum.cash > 0 || sum.inKind > 0) && (
            <dl className="supporter-totals">
              {sum.cash > 0 && <div><dt>cash from sponsors in {sum.year}</dt><dd>{formatPeso(sum.cash)}</dd></div>}
              {sum.inKind > 0 && <div><dt>in-kind value in {sum.year}</dt><dd>{formatPeso(sum.inKind)}</dd></div>}
              {sum.events > 0 && <div><dt>events supported</dt><dd>{sum.events}</dd></div>}
            </dl>
          )}
        </div>
      )}

      <div className="supporters-cta">
        <div>
          <h3>Want to join the next one?</h3>
          <p>Venues, clinics, brands and kind humans: tell us how you'd like to take part and we'll get in touch.</p>
        </div>
        <button type="button" className="button primary" onClick={() => onJoin("Sponsor")}>Bring your brand to an event <Icon name="arrow" size={16} /></button>
      </div>

      {open && <SupporterDialog supporter={open} onClose={close} />}
    </section>
  );
}
