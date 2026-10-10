import { Fragment } from "react";
import { journey } from "../content/journey";
import useLegal from "../lib/useLegal";

/** Renders **bold** runs; anything else is plain text. */
function Rich({ text }) {
  return text.split(/(\*\*[^*]+\*\*)/).map((part, index) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={index}>{part.slice(2, -2)}</strong>
      : <Fragment key={index}>{part}</Fragment>,
  );
}

/** Fills `[ … {org} … ]` once the registered name is released, else drops it. */
function withOrg(text, org) {
  return text.replace(/\[([^\]]*)\]/g, (_, inner) => (org ? inner.replace("{org}", org) : ""));
}

export default function Journey() {
  const legal = useLegal();

  return (
    <section className="journey section-shell" id="journey" aria-labelledby="journey-title">
      <div className="eyebrow">Our journey</div>
      <h2 id="journey-title">How the House grew, and what comes next.</h2>

      <ol className="journey-list" style={{ "--journey-count": journey.length }}>
        {journey.map((stop, index) => {
          const state = stop.upcoming ? "upcoming" : stop.highlight ? "highlight" : "past";
          return (
            <li className={`journey-stop is-${state}`} key={`${stop.when}-${index}`}>
              <span className="journey-dot" aria-hidden="true" />
              <p className="journey-when">
                {stop.when}
                {stop.upcoming && <span className="visually-hidden"> (upcoming)</span>}
              </p>
              <p className="journey-title"><Rich text={withOrg(stop.title, legal?.org)} /></p>
              {stop.note && <p className="journey-note"><Rich text={withOrg(stop.note, legal?.org)} /></p>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
