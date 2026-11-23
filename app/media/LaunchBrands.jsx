"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { SupporterDialog } from "../components/Supporters";
import { HOME_URL } from "../lib/siteSeo.mjs";

// The public brand list, loaded once the first time a chip is opened (the event page does the same).
let request = null;
const loadSupporters = () => {
  request ||= fetch("/api/supporters").then((r) => (r.ok ? r.json() : { supporters: [] })).then((d) => d.supporters || []).catch(() => { request = null; return []; });
  return request;
};

/**
 * Partners and sponsors in the media hub's launch overview (owner, 18 Nov 2026): a brand with a public record opens
 * its details in a window on the hub instead of leaving for the main site. The chip stays a real link to the main
 * site's panel, which a Ctrl/⌘-click, a middle-click or a failed load still follows.
 */
export default function LaunchBrands({ groups }) {
  const [open, setOpen] = useState(null);
  async function show(event, slug) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    const match = (await loadSupporters()).find((s) => s.slug === slug);
    if (match) setOpen(match);
    else window.location.href = event.currentTarget?.href || `${HOME_URL}/?supporter=${slug}#partners`;
  }
  return (
    <>
      <div className="media-launch-brand-groups">
      {groups.map(([title, list]) => (
        <div className="media-launch-brands" key={title}>
          <span className="media-launch-brands-title">{title}</span>
          <ul>
            {list.map((b) => {
              const mark = <span className="media-launch-logo">{b.logo ? <img src={b.logo} alt="" width={28} height={28} loading="lazy" /> : <span aria-hidden="true">{String(b.name || "").trim().charAt(0).toUpperCase() || "•"}</span>}</span>;
              return (
                <li key={b.name}>
                  {b.slug
                    ? <a href={`${HOME_URL}/?supporter=${b.slug}#partners`} onClick={(e) => show(e, b.slug)} aria-haspopup="dialog">{mark}{b.name}</a>
                    : <>{mark}{b.name}</>}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      </div>
      {/* Outside the dark launch card, so its white text rules don't reach the light dialog. */}
      {open && createPortal(<SupporterDialog supporter={open} onClose={() => setOpen(null)} />, document.body)}
    </>
  );
}
