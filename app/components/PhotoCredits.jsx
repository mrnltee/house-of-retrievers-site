"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";

const initial = (name) => String(name || "?").trim().charAt(0).toUpperCase();

/** A photographer's card (opened from their credit): photo, bio, portfolio and socials. */
function PhotographerCard({ person, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    const close = () => onClose();
    el?.addEventListener("close", close);
    return () => el?.removeEventListener("close", close);
  }, [onClose]);
  const portfolio = person.links.find((l) => l.key === "website");
  const socials = person.links.filter((l) => l.key !== "website");
  return (
    <dialog ref={dialog} className="supporter-dialog photographer-dialog" aria-labelledby="photographer-title" onClick={(e) => e.target === dialog.current && dialog.current.close()}>
      <div className="supporter-dialog-body">
        <div className="supporter-dialog-top">
          <span className="photographer-photo">{person.photo ? <img src={person.photo} alt={person.name} /> : <span aria-hidden="true">{initial(person.name)}</span>}</span>
          <div>
            <p className="supporter-chips"><span className="supporter-chip">Photographer</span></p>
            <h3 id="photographer-title">{person.name}</h3>
          </div>
          <button type="button" className="supporter-close" onClick={() => dialog.current.close()} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>
        {person.bio && <p className="supporter-blurb">{person.bio}</p>}
        {portfolio && <p style={{ margin: 0 }}><a className="button primary" href={portfolio.url} target="_blank" rel="noopener noreferrer">View portfolio <Icon name="external" size={14} /></a></p>}
        {socials.length > 0 && (
          <p className="supporter-links">
            {socials.map((l) => <a key={l.key} href={l.url} target="_blank" rel="noopener noreferrer">{l.label} <Icon name="external" size={13} /></a>)}
          </p>
        )}
      </div>
    </dialog>
  );
}

/** "Photos by" on a past event (owner, 2026-11-04): each credited photographer opens their card. */
export default function PhotoCredits({ photographers }) {
  const [open, setOpen] = useState(null);
  if (!photographers?.length) return null;
  return (
    <section className="event-supporters photo-credits" aria-labelledby="photos-by-title">
      <p className="event-supporters-role" id="photos-by-title">Photos by</p>
      <ul>
        {photographers.map((p) => (
          <li key={p.id} className="has-logo">
            <button type="button" className="photo-credit" onClick={() => setOpen(p)} aria-haspopup="dialog">
              <span className="event-supporter-logo" aria-hidden="true">{p.photo ? <img src={p.photo} alt="" width={32} height={32} /> : <span className="event-supporter-initial">{initial(p.name)}</span>}</span>
              {p.name}
              <Icon name="arrow" size={13} />
            </button>
          </li>
        ))}
      </ul>
      {open && <PhotographerCard person={open} onClose={() => setOpen(null)} />}
    </section>
  );
}
