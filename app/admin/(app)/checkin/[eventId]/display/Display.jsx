"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { checkinFeed } from "../../../../actions";
import { MAX_QUEUE, POLL_MS, enqueue, holdSeconds } from "../../../../../lib/checkinDisplay.mjs";
import { welcomeMessageLine } from "../../../../../lib/welcomePhoto.mjs";

const timeOf = (iso) => new Date(iso).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" });

function Face({ base, eventId, person, size = "big" }) {
  const [shown, setShown] = useState(false);
  const src = person.photo ? `${base}/checkin/photo/${eventId}/${person.id}?v=${encodeURIComponent(person.photo.version)}` : null;
  return (
    <span className={`checkin-welcome-photo display-face is-${size}`} aria-hidden="true">
      <span className="checkin-welcome-initials">{person.initials || "?"}</span>
      {src && <img src={src} alt="" className={shown ? "is-shown" : ""} onLoad={() => setShown(true)} onError={() => setShown(false)} />}
    </span>
  );
}

/**
 * The check-in display screen (owner, 2026-11-12). Asks the server every few
 * seconds who has been checked in since last time (by any phone at the door,
 * scan or by name) and pops up a welcome for each: 10 s alone, 5 s each when
 * others are waiting. Nothing here checks anyone in.
 */
export default function Display({ base, eventId, title, message, back }) {
  const [current, setCurrent] = useState(null);
  const [queue, setQueue] = useState([]);
  const [recent, setRecent] = useState([]);
  const [counts, setCounts] = useState({ checked: 0, confirmed: 0 });
  const [status, setStatus] = useState("connecting");
  const cursor = useRef(null);
  const seen = useRef(new Set());
  const line = welcomeMessageLine(message);

  const poll = useCallback(async () => {
    try {
      const feed = await checkinFeed(eventId, cursor.current);
      if (feed.forbidden) { setStatus("forbidden"); return; }
      if (!feed.cursor) return;
      setCounts({ checked: feed.checked ?? 0, confirmed: feed.confirmed ?? 0 });
      setRecent((list) => {
        const byId = new Map([...feed.arrivals, ...list].map((a) => [a.id, a]));
        return [...byId.values()].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
      });
      if (feed.first) feed.arrivals.forEach((a) => seen.current.add(a.id)); // Already here when the screen opened: listed, not popped up.
      else {
        // Worked out once, here: a state updater may run twice, and `seen` must only change once.
        const fresh = enqueue([], feed.arrivals, seen.current);
        if (fresh.length) setQueue((q) => [...q, ...fresh].slice(-MAX_QUEUE));
      }
      cursor.current = feed.cursor;
      setStatus("live");
    } catch {
      setStatus("offline");
    }
  }, [eventId]);

  useEffect(() => {
    let stop = false;
    let timer;
    const loop = async () => {
      if (stop) return;
      await poll();
      if (!stop) timer = window.setTimeout(loop, POLL_MS);
    };
    loop();
    return () => { stop = true; window.clearTimeout(timer); };
  }, [poll]);

  // The next guest takes the screen when the current one's time is up.
  // Its time counts from when it appeared, so new arrivals only shorten it (to 5 s), never restart it.
  const shownAt = useRef(0);
  useEffect(() => {
    if (!current && queue.length) {
      shownAt.current = Date.now();
      setCurrent(queue[0]);
      setQueue((q) => q.slice(1));
    }
  }, [current, queue]);
  useEffect(() => {
    if (!current) return undefined;
    const left = Math.max(0, holdSeconds(queue.length) * 1000 - (Date.now() - shownAt.current));
    const timer = window.setTimeout(() => setCurrent(null), left);
    return () => window.clearTimeout(timer);
  }, [current, queue.length]);

  const fullScreen = () => document.documentElement.requestFullscreen?.().catch(() => null);

  return (
    <div className="checkin-display">
      <header className="checkin-display-head">
        <span className="checkin-display-title">{title}</span>
        <span className="checkin-display-count" aria-live="polite">{counts.checked} of {counts.confirmed} checked in</span>
        <span className={`checkin-display-status is-${status}`}>{status === "live" ? "Live" : status === "offline" ? "Reconnecting…" : status === "forbidden" ? "No access" : "Connecting…"}</span>
        <button type="button" className="checkin-display-btn" onClick={fullScreen}>Full screen</button>
        <a className="checkin-display-btn" href={back}>Back to scanner</a>
      </header>

      <main className="checkin-display-stage" aria-live="assertive">
        {current ? (
          <div className="checkin-display-card" key={current.id}>
            <Face base={base} eventId={eventId} person={current} />
            <p className="tag">Welcome to</p>
            <h1 className="checkin-display-event">{title}</h1>
            {current.comp && <p className="checkin-welcome-comp">{current.comp} · Complimentary</p>}
            <p className="checkin-display-name">{current.name}</p>
            {current.furbaby && <p className="checkin-display-furbaby">with {current.furbaby}</p>}
            {line && <p className="checkin-display-message">{line}</p>}
            {queue.length > 0 && <p className="checkin-display-more">+{queue.length} more arriving</p>}
          </div>
        ) : (
          <div className="checkin-display-idle">
            <p className="tag">Welcome to</p>
            <h1 className="checkin-display-event">{title}</h1>
            <p>Guests appear here as they're checked in at the door.</p>
          </div>
        )}
      </main>

      {recent.length > 0 && (
        <footer className="checkin-display-recent">
          <span className="tag">Just arrived</span>
          <ol>
            {recent.map((p) => (
              <li key={p.id}><Face base={base} eventId={eventId} person={p} size="small" /><span><strong>{p.name}</strong>{p.furbaby ? <span> · {p.furbaby}</span> : null}<br /><small>{timeOf(p.at)}</small></span></li>
            ))}
          </ol>
        </footer>
      )}
    </div>
  );
}
