"use client";

import { useState } from "react";

/**
 * Meet the pack on /media: each founding family's card flips to show their rate card.
 * The rate card (numbers, rates, collaboration contact) appears only when HoR has switched it on
 * with the family's OK (app/lib/mediaReach.mjs); otherwise the back says it is available on request.
 * The flip button is a transparent layer over the card, not a wrapper: wrapped, its label would hide the
 * rate card from screen readers. It says whether the rate card is open (aria-expanded) and which it is.
 * Links sit below the card, outside the button: a link inside a button is invalid.
 */
export default function PackCards({ pack }) {
  const [flipped, setFlipped] = useState({});
  const toggle = (handle) => setFlipped((current) => ({ ...current, [handle]: !current[handle] }));
  return (
    <ul className="media-pack">
      {pack.map((family) => {
        const isFlipped = Boolean(flipped[family.handle]);
        const card = family.stats;
        const contactHref = card?.contact ? (card.contact.includes("@") && !card.contact.startsWith("http") ? `mailto:${card.contact}` : card.contact) : "";
        return (
          <li key={family.handle} className={`media-pack-card${isFlipped ? " is-flipped" : ""}`}>
            <div className="media-pack-stage">
              <span className="media-pack-inner">
                <span className="media-pack-face media-pack-front" aria-hidden={isFlipped}>
                  <img src={family.photo} alt="" loading="lazy" />
                  <strong>{family.names}</strong>
                  <small>{family.group}</small>
                  <span className="media-pack-hint">Rate card <span aria-hidden="true">↻</span></span>
                </span>
                <span className="media-pack-face media-pack-back" id={`rate-${family.handle.slice(1).replace(/[^a-z0-9]+/gi, "-")}`} aria-hidden={!isFlipped}>
                  <span className="media-pack-label">Rate card · Instagram</span>
                  <strong>{family.names}</strong>
                  {card ? <>
                    {card.followers ? <span className="media-pack-stats"><span><b>{card.followers}</b>followers</span>{card.posts ? <span><b>{card.posts}</b>posts</span> : null}</span> : null}
                    {card.rates.length ? <span className="media-pack-rates" role="list">{card.rates.map((rate) => <span role="listitem" key={rate.label}><span>{rate.label}</span><b>{rate.amount}</b></span>)}</span> : null}
                    <small className="media-pack-asof">As of {card.asOf}</small>
                  </> : <span className="media-pack-note">Rate card available on request. Contact the family through their profile.</span>}
                </span>
              </span>
              <button type="button" className="media-pack-flip" onClick={() => toggle(family.handle)} aria-expanded={isFlipped}
                aria-controls={`rate-${family.handle.slice(1).replace(/[^a-z0-9]+/gi, "-")}`}
                aria-label={`${family.names}'s rate card`} />
            </div>
            <span className="media-pack-links">
              <a href={family.url} target="_blank" rel="noopener noreferrer">{family.handle}</a>
              {isFlipped && contactHref ? <a href={contactHref} target={contactHref.startsWith("mailto:") ? undefined : "_blank"} rel={contactHref.startsWith("mailto:") ? undefined : "noopener noreferrer"}>Collaborations</a> : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
