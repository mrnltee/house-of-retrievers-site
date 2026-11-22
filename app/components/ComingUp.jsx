import Icon from "./Icon";
import { EVENTS_URL } from "../lib/eventsHost.mjs";
import { formatWhen } from "../lib/share.mjs";

/**
 * The next event, right under the hero (audit #3, 23 Nov 2026). Before this the
 * nearest open event was about 6,000 px down, at the end of the timeline.
 * Shown only when there is an upcoming published event; the whole card is one
 * link to its page on the events site, plus a link to the rest.
 */
export default function ComingUp({ event, more = 0 }) {
  if (!event) return null;
  const href = `${EVENTS_URL}/${event.slug}`;
  const where = [event.venue, event.city].filter(Boolean).join(", ");
  const price = event.pricePending ? "Price revealed when RSVPs open" : event.cost;
  return (
    <section className="coming-up" aria-labelledby="coming-up-title">
      <div className="coming-up-inner">
        <a className="coming-up-card" href={href}>
          {event.image && <img src={event.image} alt="" width="96" height="120" loading="lazy" />}
          <span className="coming-up-body">
            <span className="coming-up-label" id="coming-up-title">Coming up</span>
            <strong>{event.title}</strong>
            <span className="coming-up-facts">
              <span><Icon name="calendar" size={14} /> {formatWhen(event)}</span>
              {where && <span><Icon name="pin" size={14} /> {where}</span>}
              {price && <span className="coming-up-price">{price}</span>}
            </span>
          </span>
          <span className="coming-up-go" aria-hidden="true">See the event <Icon name="arrow" size={16} /></span>
        </a>
        <a className="coming-up-all" href={EVENTS_URL}>{more > 0 ? `All events · ${more + 1} coming up` : "All events"} <Icon name="arrow" size={14} /></a>
      </div>
    </section>
  );
}
