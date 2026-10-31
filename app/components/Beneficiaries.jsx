"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";
import { yearsLine } from "../lib/beneficiaries.mjs";

const initials = (name) => name.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w)).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

/** One beneficiary: logo, who they are, the years and events that helped them, and their links. */
function Card({ b }) {
  const latest = b.events[0];
  const years = yearsLine(b);
  return (
    <li className="beneficiary-card">
      <span className="beneficiary-logo" aria-hidden="true">{b.logo ? <img src={b.logo} alt="" loading="lazy" /> : initials(b.name)}</span>
      <div className="beneficiary-body">
        <p className="beneficiary-meta">{[b.kind, b.location].filter(Boolean).join(" · ")}</p>
        <h4>{b.name}</h4>
        <p className="beneficiary-blurb">{b.blurb}</p>
        {(years || latest) && (
          <p className="beneficiary-events">
            {years && <strong>{years}</strong>}
            {latest && <span>Through <a href={latest.url}>{latest.title}</a>{b.events.length > 1 ? ` +${b.events.length - 1} more` : ""}</span>}
          </p>
        )}
        {(b.instagram || b.website) && (
          <p className="beneficiary-links">
            {b.instagram && <a href={b.instagram} target="_blank" rel="noopener noreferrer">Instagram <Icon name="external" size={13} /></a>}
            {b.website && <a href={b.website} target="_blank" rel="noopener noreferrer">Website <Icon name="external" size={13} /></a>}
          </p>
        )}
      </div>
    </li>
  );
}

/**
 * Home page: the shelters, rescues and homes our charity events have helped,
 * from the past to now. Admins pick who shows (Beneficiaries → On the website).
 */
export default function Beneficiaries() {
  const [list, setList] = useState([]);

  useEffect(() => {
    let live = true;
    fetch("/api/beneficiaries")
      .then((r) => (r.ok ? r.json() : { beneficiaries: [] }))
      .then(({ beneficiaries }) => live && setList(beneficiaries || []))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  if (!list.length) return null;
  const now = list.filter((b) => b.current);
  const before = list.filter((b) => !b.current);

  return (
    <section className="beneficiaries section-shell" id="beneficiaries" aria-labelledby="beneficiaries-title">
      <div className="supporters-head">
        <p className="eyebrow">Where the help goes</p>
        <h2 id="beneficiaries-title">The causes <em>our events support.</em></h2>
        <p className="supporters-lead">Our charity events raise funds and goods for the shelters, rescues and homes below, from our first events to the ones coming up.</p>
      </div>
      {now.length > 0 && (
        <div className="supporters-group">
          <h3>Currently supporting <small>Beneficiaries of our current events</small></h3>
          <ul className="beneficiary-grid">{now.map((b) => <Card key={b.id} b={b} />)}</ul>
        </div>
      )}
      {before.length > 0 && (
        <div className="supporters-group">
          <h3>Past beneficiaries <small>Helped through our earlier events</small></h3>
          <ul className="beneficiary-grid">{before.map((b) => <Card key={b.id} b={b} />)}</ul>
        </div>
      )}
    </section>
  );
}
