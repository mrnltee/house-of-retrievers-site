"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { byTier, gaveLine, totals } from "../lib/supporters.mjs";

const formatPeso = (n) => `₱${Number(n).toLocaleString("en-PH")}`;
const formatDate = (iso) => new Date(`${iso}T00:00:00+08:00`).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", weekday: "short", month: "short", day: "numeric", year: "numeric" });
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
const CAROUSEL_PAGE_SIZE = 5;

function Tile({ supporter, big = false, onOpen }) {
  return (
    <li>
      <button type="button" className={`supporter-tile${big ? " is-big" : ""}`} onClick={() => onOpen(supporter)} aria-haspopup="dialog">
        <span className="supporter-logo"><img src={supporter.logo} alt="" loading="lazy" /></span>
        <span className="supporter-name">{supporter.name}</span>
      </button>
    </li>
  );
}

function SupporterWall({ items, onOpen, label }) {
  const carousel = items.length > CAROUSEL_PAGE_SIZE;
  const pageCount = Math.ceil(items.length / CAROUSEL_PAGE_SIZE);
  const [page, setPage] = useState(0);
  const start = page * CAROUSEL_PAGE_SIZE;
  const visible = carousel ? items.slice(start, start + CAROUSEL_PAGE_SIZE) : items;

  useEffect(() => {
    setPage((current) => Math.min(current, Math.max(0, pageCount - 1)));
  }, [pageCount]);

  return (
    <div className={`supporter-carousel${carousel ? " is-carousel" : ""}`} aria-label={`${label} logos`}>
      {carousel && (
        <div className="supporter-carousel-controls">
          <p aria-live="polite">Showing {start + 1}–{Math.min(start + CAROUSEL_PAGE_SIZE, items.length)} of {items.length}</p>
          <div>
            <button type="button" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0} aria-label={`Previous ${label.toLowerCase()} logos`}><span aria-hidden="true">←</span></button>
            <button type="button" onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))} disabled={page === pageCount - 1} aria-label={`Next ${label.toLowerCase()} logos`}><span aria-hidden="true">→</span></button>
          </div>
        </div>
      )}
      <ul className="supporter-wall">
        {visible.map((s) => <Tile key={s.slug} supporter={s} onOpen={onOpen} />)}
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
        {(supporter.website || supporter.instagram) && (
          <p className="supporter-links">
            {supporter.website && <a href={supporter.website} target="_blank" rel="noopener noreferrer">Website <Icon name="external" size={13} /></a>}
            {supporter.instagram && <a href={supporter.instagram} target="_blank" rel="noopener noreferrer">Instagram <Icon name="external" size={13} /></a>}
          </p>
        )}
        {supporter.events.length > 0 && (
          <div className="supporter-events">
            <p className="supporter-label">Events they backed</p>
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
 * "Our partners & sponsors" on the home page (Figma "Sponsors & partners",
 * W1/W2). Reads /api/supporters; with nothing public yet it renders nothing.
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
        <h2 id="partners-title">Our partners <em>&amp; sponsors.</em></h2>
        <p className="supporters-lead">Every run, care visit and fundraiser happens because someone lent a venue, a vet team, treats or funds. Thank you.</p>
      </div>

      {partners.length > 0 && (
        <div className="supporters-group">
          <h3>Partners <small>Run events with us</small></h3>
          <SupporterWall items={partners} onOpen={setOpen} label="Partner" />
        </div>
      )}

      {sponsors.length > 0 && (
        <div className="supporters-group">
          <h3>Sponsors <small>Give funds, products or prizes</small></h3>
          {byTier(sponsors).map((group) => (
            <div key={group.key} className="supporter-tier">
              {group.name && <p className="supporter-label">★ {group.name}</p>}
              <SupporterWall items={group.items} onOpen={setOpen} label={group.name || "Sponsor"} />
            </div>
          ))}
          {sum && (sum.cash > 0 || sum.inKind > 0) && (
            <dl className="supporter-totals">
              {sum.cash > 0 && <div><dt>cash from sponsors in {sum.year}</dt><dd>{formatPeso(sum.cash)}</dd></div>}
              {sum.inKind > 0 && <div><dt>in-kind value in {sum.year}</dt><dd>{formatPeso(sum.inKind)}</dd></div>}
              {sum.events > 0 && <div><dt>events backed</dt><dd>{sum.events}</dd></div>}
            </dl>
          )}
        </div>
      )}

      <div className="supporters-cta">
        <div>
          <h3>Want to back the next one?</h3>
          <p>Venues, clinics, brands and kind humans: tell us what you'd like to support and we'll get in touch.</p>
        </div>
        <button type="button" className="button primary" onClick={() => onJoin("Sponsor")}>Become a sponsor or partner <Icon name="arrow" size={16} /></button>
      </div>

      {open && <SupporterDialog supporter={open} onClose={close} />}
    </section>
  );
}
