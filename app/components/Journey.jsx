import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowRight, BadgeCheck, CalendarHeart, Camera, MapPin, Pause, Play } from "lucide-react";
import { journey } from "../content/journey";
import { EVENTS_URL } from "../lib/eventsHost.mjs";
import { manilaMonth, monthLabel, stopStatus, withOrg } from "../lib/journeyStatus.mjs";
import useLegal from "../lib/useLegal";

const SLIDE_MS = 5200;

function useReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

/**
 * The card's picture: a still, a slow fade-and-pan through several photos,
 * or a designed placeholder until photos are chosen. Moves only while on
 * screen, never under reduced motion, and stops with the section's pause.
 */
function JourneyMedia({ stop, status, index, playing }) {
  const photos = stop.photos ?? [];
  const frame = useRef(null);
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (photos.length < 2) return undefined;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.4 });
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, [photos.length]);

  useEffect(() => {
    if (photos.length < 2 || !visible || !playing) return undefined;
    // Cards start a little apart so neighbouring photos never change together.
    let timer = window.setTimeout(function advance() {
      setActive((current) => (current + 1) % photos.length);
      timer = window.setTimeout(advance, SLIDE_MS);
    }, SLIDE_MS + (index % 3) * 900);
    return () => window.clearTimeout(timer);
  }, [photos.length, visible, playing, index]);

  if (!photos.length) {
    const kind = stop.mark === "milestone" ? "milestone" : status;
    const Icon = kind === "milestone" ? BadgeCheck : kind === "upcoming" ? CalendarHeart : Camera;
    const note = kind === "milestone" ? "Officially registered" : kind === "upcoming" ? "Save the date" : "Photos coming soon";
    const month = stop.month ? monthLabel(stop.month).split(" ")[0] : "TBA";
    return (
      <div className={`journey-media journey-placeholder is-${kind}`} ref={frame} aria-hidden="true">
        <span className="journey-placeholder-month">{month.slice(0, 3)}</span>
        <span className="journey-placeholder-note"><Icon size={22} strokeWidth={1.5} />{note}</span>
      </div>
    );
  }

  return (
    <div className="journey-media" ref={frame}>
      {photos.map((photo, i) => (
        <img
          key={photo.src}
          className={i === active ? "is-active" : undefined}
          style={{ "--pan": i % 2 ? "2.5%" : "-2.5%" }}
          src={photo.src}
          alt={i === active ? photo.alt : ""}
          aria-hidden={i !== active}
          loading="lazy"
          decoding="async"
        />
      ))}
      {photos.length > 1 && (
        <div className="journey-dots">
          {photos.map((photo, i) => (
            <button
              type="button"
              key={photo.src}
              className={i === active ? "active" : undefined}
              aria-label={`${stop.title}, photo ${i + 1} of ${photos.length}`}
              aria-current={i === active}
              onClick={() => setActive(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * "Our journey": one centre line, oldest at the top, cards alternating
 * either side of it on wide screens and stacked beside it on phones. A gold
 * line fills down the past as the visitor scrolls; the line turns dashed
 * where the upcoming stops begin.
 */
export default function Journey({ onJoin }) {
  const legal = useLegal();
  const reducedMotion = useReducedMotion();
  const list = useRef(null);
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  const current = manilaMonth();
  const stops = journey.map((stop) => ({ ...stop, status: stopStatus(stop, current) }));
  const firstUpcoming = stops.findIndex((stop) => stop.status === "upcoming");
  const hasSlideshows = stops.some((stop) => (stop.photos?.length ?? 0) > 1);

  // Reveal each stop as it comes into view (content stays visible without JS).
  useEffect(() => {
    const el = list.current;
    setReady(true);
    const items = el.querySelectorAll(".journey-stop, .journey-divider");
    if (reducedMotion) {
      items.forEach((item) => item.classList.add("is-in"));
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      }
    }, { rootMargin: "0px 0px -12% 0px" });
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [reducedMotion]);

  // The gold line: follows the reader down to where the upcoming stops begin.
  useEffect(() => {
    const el = list.current;
    let frame = 0;
    const limit = () => {
      const boundary = el.querySelector(".journey-divider");
      return boundary ? boundary.offsetTop + boundary.offsetHeight / 2 : el.offsetHeight;
    };
    const update = () => {
      frame = 0;
      const max = limit();
      const reach = reducedMotion ? max : window.innerHeight * 0.62 - el.getBoundingClientRect().top;
      el.style.setProperty("--journey-fill", `${Math.max(0, Math.min(reach, max))}px`);
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [reducedMotion]);

  return (
    <section className="journey section-shell" id="journey" aria-labelledby="journey-title">
      <div className="journey-head">
        <div className="eyebrow">Our journey</div>
        <h2 id="journey-title">How the House grew, <em>and what comes next.</em></h2>
        <p className="journey-lead">From our first gathering in May to a registered society in September. Here’s where we’ve been, and where we’re headed next.</p>
        {hasSlideshows && !reducedMotion && (
          <button type="button" className="journey-pause" onClick={() => setPaused((value) => !value)} aria-pressed={paused}>
            {paused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}
            {paused ? "Play photos" : "Pause photos"}
          </button>
        )}
      </div>

      <ol className={`journey-list${ready ? " is-ready" : ""}`} ref={list}>
        {stops.map((stop, index) => {
          const side = index % 2 ? "left" : "right";
          const [month, year] = stop.month ? monthLabel(stop.month).split(" ") : ["Soon", "Date to be announced"];
          const href = stop.event ? `${EVENTS_URL}/${stop.event}` : null;
          return (
            <Fragment key={stop.id}>
              {index === firstUpcoming && (
                <li className="journey-divider" aria-hidden="true"><span>Coming up</span></li>
              )}
              <li className={`journey-stop is-${stop.status} is-${side}${stop.mark ? ` is-${stop.mark}` : ""}${href ? " is-linked" : ""}`}>
                <p className="journey-when">
                  {stop.month
                    ? <time dateTime={stop.month}><span className="journey-when-month">{month}</span> <span className="journey-when-year">{year}</span></time>
                    : <><span className="journey-when-month">{month}</span> <span className="journey-when-year">{year}</span></>}
                  {stop.status === "upcoming" && <span className="visually-hidden">, upcoming</span>}
                </p>
                <span className="journey-dot" aria-hidden="true" />
                <article className="journey-card">
                  <JourneyMedia stop={stop} status={stop.status} index={index} playing={!paused && !reducedMotion} />
                  <div className="journey-body">
                    <p className="journey-tag">{stop.status === "upcoming" ? "Upcoming" : stop.tag}</p>
                    <h3>{href ? <a className="journey-card-link" href={href}>{stop.title}</a> : stop.title}</h3>
                    {stop.theme && <p className="journey-theme">{stop.theme}</p>}
                    {stop.place && <p className="journey-place"><MapPin size={15} aria-hidden="true" />{stop.place}</p>}
                    {stop.story && <p className="journey-story">{withOrg(stop.story, legal?.org)}</p>}
                    {href && <span className="journey-link" aria-hidden="true">{stop.status === "upcoming" ? "Event details" : "See the event"} <ArrowRight size={15} /></span>}
                  </div>
                </article>
              </li>
            </Fragment>
          );
        })}
        <li className="journey-stop journey-end">
          <span className="journey-dot" aria-hidden="true" />
          <div className="journey-card">
            <p className="journey-tag">What’s next</p>
            <h3>Your chapter starts here.</h3>
            <p className="journey-story">There is always room for one more good human. Join as a member, volunteer or partner, with or without a dog.</p>
            <div className="journey-end-actions">
              <button type="button" className="button primary" onClick={() => onJoin?.()}>Join the pack</button>
              <a className="journey-link" href={EVENTS_URL}>See upcoming events <ArrowRight size={15} aria-hidden="true" /></a>
            </div>
          </div>
        </li>
      </ol>
    </section>
  );
}
