import { useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import BackgroundVideo from "./BackgroundVideo";
import Icon from "./Icon";
import { activities, missionFacts } from "../content/activities";
import { EVENTS_URL } from "../lib/eventsHost.mjs";
import { formatWhen } from "../lib/share.mjs";
import { trackCta } from "../lib/analytics.mjs";

/** Above this many photos the dots stop fitting the control pill on a phone. */
const MAX_DOTS = 6;

function StoryMedia({ item }) {
  const container = useRef(null);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [slide, setSlide] = useState(0);
  const gallery = item.gallery;
  const activeSlide = gallery ? slide % gallery.length : 0;

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(motion.matches);
    updateMotion();
    motion.addEventListener("change", updateMotion);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", updateMotion);
    };
  }, []);

  useEffect(() => {
    if (!gallery || !visible || reducedMotion) return;
    const timer = window.setInterval(() => {
      setSlide((current) => (current + 1) % gallery.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [gallery, visible, reducedMotion]);

  return (
    <div className="pillar-media" ref={container}>
      {gallery ? (
        <div className="story-carousel" role="region" aria-roledescription="carousel" aria-label={`${item.title} photos`}>
          {gallery.map((photo, index) => (
            (index === activeSlide || index === (activeSlide + 1) % gallery.length || index === (activeSlide - 1 + gallery.length) % gallery.length) && <img
              key={photo.src}
              className={index === activeSlide ? "story-carousel-slide active" : "story-carousel-slide"}
              src={photo.src}
              loading="lazy"
              decoding="async"
              alt={index === activeSlide ? photo.alt : ""}
              aria-hidden={index !== activeSlide}
            />
          ))}
          <div className="story-carousel-controls" aria-label={`${item.title} gallery controls`}>
            <button type="button" onClick={() => setSlide((current) => (current - 1 + gallery.length) % gallery.length)} aria-label={`Previous ${item.title} photo`}>
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            {gallery.length > MAX_DOTS ? (
              <p className="story-carousel-count" aria-live="polite">{activeSlide + 1} / {gallery.length}</p>
            ) : (
              <div className="story-carousel-dots">
                {gallery.map((photo, index) => (
                  <button
                    key={photo.src}
                    type="button"
                    className={index === activeSlide ? "active" : ""}
                    onClick={() => setSlide(index)}
                    aria-label={`Show ${item.title} photo ${index + 1} of ${gallery.length}`}
                    aria-current={index === activeSlide ? "true" : undefined}
                  />
                ))}
              </div>
            )}
            <button type="button" onClick={() => setSlide((current) => (current + 1) % gallery.length)} aria-label={`Next ${item.title} photo`}>
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : item.video ? (
        <BackgroundVideo className="story-video" src={item.video} poster={item.image} aria-label={item.alt} controlLabel={`${item.title} video`} />
      ) : (
        <img loading="lazy" decoding="async" className="pillar-image" src={item.image} alt={item.alt} />
      )}
    </div>
  );
}

/**
 * "What moves us" (26 Nov 2026, owner picked direction C + the fact strip):
 * the intro, three facts and the three pillars as tabs on the left; the chosen
 * pillar's photos on the right with its story and button over them, then a
 * "Last time" note (or, for giving, how giving works) and, when the next event
 * names a beneficiary, a card for it. Every button sends a GA4 `cta_click`.
 */
export default function PurposeStories({ onJoin, onSupport, nextEvent = null }) {
  const [active, setActive] = useState(0);
  const tabs = useRef([]);
  const base = useId();
  const item = activities[active];
  const number = String(active + 1).padStart(2, "0");
  const tabId = (index) => `${base}-tab-${index}`;
  const panelId = `${base}-panel`;
  const giving = nextEvent?.supports ? nextEvent : null;

  const act = (action) => {
    trackCta(action.track, "mission", { pillar: active + 1 });
    if (action.kind === "support") onSupport?.();
    else onJoin?.(action.interest);
  };

  const onKeyDown = (event) => {
    const last = activities.length - 1;
    const keys = { ArrowRight: active + 1, ArrowDown: active + 1, ArrowLeft: active - 1, ArrowUp: active - 1, Home: 0, End: last };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const next = (keys[event.key] + activities.length) % activities.length;
    setActive(next);
    tabs.current[next]?.focus();
  };

  return (
    <section className="mission section-shell" id="mission" aria-labelledby={`${base}-title`}>
      <div className="mission-grid">
        <div className="mission-side">
          <div className="eyebrow">What moves us</div>
          <h2 id={`${base}-title`}>More than a breed.<br />{" "}<em>A way to give back.</em></h2>
          <p className="mission-lead">We bring furparents and their furbabies together to serve our communities, grow alongside each other, and turn a gathering into something that gives back.</p>

          <dl className="mission-facts">
            {missionFacts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.value}</dt>
                <dd>{fact.label}</dd>
              </div>
            ))}
          </dl>

          <div className="mission-tabs" role="tablist" aria-label="What we do" onKeyDown={onKeyDown}>
            {activities.map((pillar, index) => (
              <button
                key={pillar.title}
                ref={(node) => { tabs.current[index] = node; }}
                id={tabId(index)}
                type="button"
                role="tab"
                aria-selected={index === active}
                aria-controls={panelId}
                tabIndex={index === active ? 0 : -1}
                className={index === active ? "active" : ""}
                onClick={() => setActive(index)}
              >
                <span className="mission-tab-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="mission-tab-title">{pillar.title}</span>
                <Icon name="arrow" size={18} />
              </button>
            ))}
          </div>
        </div>

        <div className="mission-stage" role="tabpanel" id={panelId} aria-labelledby={tabId(active)}>
          <div className="mission-photo">
            <div className="mission-frame"><StoryMedia key={item.title} item={item} /></div>
            <div className="mission-caption">
              <div className="eyebrow">{number} · {item.eyebrow}</div>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
              <div className="mission-actions">
                <button type="button" className="button primary" onClick={() => act(item.action)}>
                  {item.action.label} <Icon name="arrow" size={16} />
                </button>
                {item.secondary && (
                  <button type="button" className="mission-link" onClick={() => act(item.secondary)}>{item.secondary.label}</button>
                )}
              </div>
            </div>
          </div>

          {item.steps ? (
            <div className="mission-note">
              <div className="mission-note-label">How giving works here</div>
              <ol className="mission-steps">
                {item.steps.map((step) => (
                  <li key={step}><Icon name="check" size={16} />{step}</li>
                ))}
              </ol>
            </div>
          ) : item.proof ? (
            <div className="mission-note">
              <div className="mission-note-label">{item.proof.label}</div>
              <p>{item.proof.text}</p>
            </div>
          ) : null}

          {item.steps && giving && (
            <a
              className="mission-next"
              href={`${EVENTS_URL}/${giving.slug}`}
              onClick={() => trackCta("mission_next_event", "mission", { event: giving.slug })}
            >
              <span>
                <span className="mission-next-label">Next · {formatWhen(giving)}</span>
                <strong>{giving.title}</strong>
                <span className="mission-next-for">For {giving.supports}</span>
              </span>
              <span className="mission-next-go">See the event <Icon name="arrow" size={16} /></span>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
