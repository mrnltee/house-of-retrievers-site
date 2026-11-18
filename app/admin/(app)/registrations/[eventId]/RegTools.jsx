"use client";

import { useEffect, useState } from "react";

/**
 * Registrations list tools (owner design review, 17 Nov 2026), built like the Guest and Brand trackers:
 * a search over the rows on screen, sort, ticks and a selection bar that sends to whoever is ticked.
 */
const ROWS = "#reg-rows tr[data-row]";
const ticked = () => [...document.querySelectorAll("input[name='reg'][data-reg-pick]")].filter((b) => b.checked && !b.closest("tr")?.hidden);

export function RegSearch({ total, sort, sortBase, tickets = [] }) {
  const [q, setQ] = useState("");
  // Ticket filter (owner, 18 Nov 2026): Complimentary, Early Bird, Regular… rows carry their keys in data-ticket.
  const [ticket, setTicket] = useState("");
  const [shown, setShown] = useState(total);
  useEffect(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    let n = 0;
    document.querySelectorAll(ROWS).forEach((tr) => {
      const hit = words.every((w) => (tr.dataset.search || "").includes(w)) && (!ticket || (tr.dataset.ticket || "").split(" ").includes(ticket));
      tr.hidden = !hit;
      if (hit) n += 1;
    });
    setShown(n);
    document.dispatchEvent(new Event("change"));
  }, [q, ticket]);
  return (
    <div className="tracker-tools reg-tools">
      <label className="tracker-search">
        <span className="sr-only">Search registrations</span>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, furbaby, reference…" autoComplete="off" />
      </label>
      {tickets.length > 1 && (
        <label className="tracker-group">
          <span className="sr-only">Show one ticket</span>
          <select value={ticket} onChange={(e) => setTicket(e.target.value)}>
            <option value="">All tickets</option>
            {tickets.map(([key, label, n]) => <option key={key} value={key}>{label} · {n}</option>)}
          </select>
        </label>
      )}
      <label className="tracker-sort">
        <span className="sr-only">Sort</span>
        <select value={sort} onChange={(e) => { const url = new URL(sortBase, window.location.href); url.searchParams.set("sort", e.target.value); window.location.href = url.pathname + url.search; }}>
          <option value="old">Oldest first</option>
          <option value="new">Newest first</option>
          <option value="name">Name A–Z</option>
        </select>
      </label>
      <p className="small muted tracker-shown" aria-live="polite">{q || ticket ? (shown ? `Showing ${shown} of ${total}.` : "Nobody matches. Try fewer or different words.") : ""}</p>
    </div>
  );
}

/** The header tick: picks every registration showing (search hides the rest). */
export function RegSelectAll() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const update = () => {
      const boxes = [...document.querySelectorAll("input[name='reg'][data-reg-pick]")].filter((b) => !b.closest("tr")?.hidden);
      setOn(boxes.length > 0 && boxes.every((b) => b.checked));
    };
    document.addEventListener("change", update);
    return () => document.removeEventListener("change", update);
  }, []);
  return (
    <input type="checkbox" aria-label="Pick everyone showing" checked={on} onChange={(e) => {
      document.querySelectorAll("input[name='reg'][data-reg-pick]").forEach((b) => { if (!b.closest("tr")?.hidden) b.checked = e.target.checked; });
      document.dispatchEvent(new Event("change"));
    }} />
  );
}

/**
 * "N selected · Email a reminder · Send a message · Send invitation card · Clear". Each opens the usual
 * window or composer with those people ticked; nothing is sent from here.
 */
export function RegSelectionBar({ reminderBase = "", messageBase, inviteBase = "", hint, refPrefix = "registration:", messageLabel = "Send a message" }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const update = () => setCount(ticked().length);
    update();
    document.addEventListener("change", update);
    return () => document.removeEventListener("change", update);
  }, []);
  function open(base, param, prefix = "") {
    const url = new URL(base, window.location.href);
    ticked().forEach((b) => url.searchParams.append(param, `${prefix}${b.value}`));
    // A link click, so letter sends open in the send window over the page like every other send.
    const link = document.createElement("a");
    link.href = url.pathname + url.search;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
  function clear() {
    ticked().forEach((b) => { b.checked = false; });
    document.dispatchEvent(new Event("change"));
  }
  return (
    <div className={`selection-bar${count ? " is-active" : ""}`} aria-live="polite">
      {count ? (
        <>
          <strong>{count} selected</strong>
          {reminderBase && <button type="button" className="btn dark small" data-confirm="not-needed-read-only" onClick={() => open(reminderBase, "to")}>Email a reminder</button>}
          {messageBase && <button type="button" className="btn ghost small" data-confirm="not-needed-read-only" onClick={() => open(messageBase, "to", refPrefix)}>{messageLabel}</button>}
          {inviteBase && <button type="button" className="btn ghost small" data-confirm="not-needed-read-only" onClick={() => open(inviteBase, "to", refPrefix)}>Send invitation card</button>}
          <button type="button" className="btn ghost small" data-confirm="not-needed-read-only" onClick={clear}>Clear</button>
        </>
      ) : (
        <span className="muted">{hint}</span>
      )}
    </div>
  );
}
