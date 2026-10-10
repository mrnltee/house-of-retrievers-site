"use client";

import { useEffect, useRef, useState } from "react";
import { searchPlaces } from "../../eventTools";
import { MAX_HASHTAGS, isPastDate, manilaDate, parseHashtags } from "../../../lib/admin/events.mjs";

/** "This is a charity event" reveals the beneficiary field. */
export function CharityField({ isCharity, supports }) {
  const [on, setOn] = useState(Boolean(isCharity));
  return (
    <div className="form" style={{ gap: 10 }}>
      <label className="check">
        <input type="checkbox" name="isCharity" checked={on} onChange={(e) => setOn(e.target.checked)} /> This is a charity event
      </label>
      {on && (
        <label className="field">
          <span>Beneficiary <small>Who the event supports, named up front, e.g. a shelter or a rescue group</small></span>
          <input type="text" name="supports" maxLength={160} defaultValue={supports || ""} required autoFocus={!isCharity} />
        </label>
      )}
    </div>
  );
}

/** Hashtags typed freely; the chips show exactly what will be saved. */
export function HashtagField({ hashtags }) {
  const [text, setText] = useState((hashtags || []).map((t) => `#${t}`).join(" "));
  const tags = parseHashtags(text);
  return (
    <label className="field">
      <span>Hashtags <small>Up to {MAX_HASHTAGS}, shown as badges on the event and added when it's shared</small></span>
      <input type="text" name="hashtags" value={text} onChange={(e) => setText(e.target.value)} placeholder="#PawsForAPurpose #HouseOfRetrieversPH" maxLength={300} />
      {tags.length > 0 && (
        <span className="tag-preview" aria-label="Saved as">
          {tags.map((tag) => <span key={tag} className="chip">#{tag}</span>)}
        </span>
      )}
    </label>
  );
}

function osmEmbed(lat, lng) {
  const d = 0.004;
  const bbox = [lng - d * 1.6, lat - d, lng + d * 1.6, lat + d].map((n) => n.toFixed(5)).join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
}

/**
 * Venue and city, with a map search (OpenStreetMap) that fills both and pins
 * the spot, and an optional Google Maps link that "Get directions" opens.
 */
export function VenueField({ venue, city, lat, lng, mapUrl }) {
  const [values, setValues] = useState({ venue: venue || "", city: city || "" });
  const [pin, setPin] = useState(Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function search() {
    const q = query.trim() || [values.venue, values.city].filter(Boolean).join(", ");
    if (!q) return setMessage("Type the venue's name or its plus code first.");
    setBusy(true);
    setMessage("");
    setResults(null);
    try {
      const { places, error } = await searchPlaces(q);
      if (error) setMessage(error);
      else if (!places.length) setMessage("Nothing found. Try a shorter name, or paste a Google Maps link below.");
      else setResults(places);
    } catch {
      setMessage("The map search didn't answer. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  function choose(place) {
    setValues({ venue: place.name, city: place.city || values.city });
    setPin({ lat: place.lat, lng: place.lng });
    setResults(null);
    setQuery("");
    setMessage(`Pinned: ${place.address}`);
  }

  return (
    <div className="form" style={{ gap: 12 }}>
      <div className="row-2">
        <label className="field"><span>Venue</span>
          <input type="text" name="venue" maxLength={160} value={values.venue} onChange={(e) => setValues({ ...values, venue: e.target.value })} />
        </label>
        <label className="field"><span>City</span>
          <input type="text" name="city" maxLength={80} value={values.city} onChange={(e) => setValues({ ...values, city: e.target.value })} />
        </label>
      </div>
      <div className="venue-search">
        <label className="field" style={{ flex: 1 }}>
          <span>Find it on the map <small>A place name, a plus code from Google Maps (e.g. H4XX+2V Makati) or coordinates. Picking a result fills Venue and City and pins the spot; edit the Venue name if it isn't the one people know.</small></span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                search();
              }
            }}
            placeholder="e.g. Bonifacio High Street, or H4XX+2V Makati"
          />
        </label>
        <button type="button" className="btn ghost small" onClick={search} disabled={busy}>{busy ? "Searching…" : "Search"}</button>
      </div>
      {results && (
        <ul className="place-results" aria-label="Places found">
          {results.map((place) => (
            <li key={`${place.lat},${place.lng}`}>
              <button type="button" onClick={() => choose(place)}>
                <strong>{place.name}</strong>
                <span className="small muted">{place.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {message && <p className="small" role="status">{message}</p>}
      {pin && (
        <div className="venue-pin">
          <iframe title="Pinned location" src={osmEmbed(pin.lat, pin.lng)} loading="lazy" />
          <button type="button" className="linkish" onClick={() => { setPin(null); setMessage("Pin removed."); }}>Remove pin</button>
        </div>
      )}
      <input type="hidden" name="venueLat" value={pin ? pin.lat : ""} />
      <input type="hidden" name="venueLng" value={pin ? pin.lng : ""} />
      <label className="field">
        <span>Google Maps link <small>Optional. In Google Maps, tap Share on the place and paste the link. "Get directions" then opens exactly that place.</small></span>
        <input type="text" inputMode="url" name="mapUrl" maxLength={500} defaultValue={mapUrl || ""} placeholder="https://maps.app.goo.gl/…" />
      </label>
    </div>
  );
}

/**
 * Sign-up settings. They follow the Date field in the same form: an event
 * dated before today is a record of what happened (details and photos), so
 * the settings give way to a note. The server enforces the same rule.
 */
export function RegistrationCard({ registration, capacity, rsvpOpen, feeRequired, date }) {
  const ref = useRef(null);
  const [past, setPast] = useState(isPastDate(date || ""));

  useEffect(() => {
    const input = ref.current?.closest("form")?.querySelector('input[name="date"]');
    if (!input) return undefined;
    const update = () => setPast(isPastDate(input.value, manilaDate()));
    update();
    input.addEventListener("input", update);
    input.addEventListener("change", update);
    return () => {
      input.removeEventListener("input", update);
      input.removeEventListener("change", update);
    };
  }, []);

  return (
    <section className="card" ref={ref}>
      <h2>Registration</h2>
      {past ? (
        <p className="banner note small" role="status">
          This date has passed, so this is a past event: no RSVPs or sign-ups. Once published it appears under "Where we have been" on the events page, with its details and photos.
        </p>
      ) : (
        <>
          <fieldset className="plain">
            <legend>Do people sign up?</legend>
            <label className="check"><input type="radio" name="registration" value="none" defaultChecked={(registration || "none") === "none"} /> No, anyone can come along</label>
            <label className="check"><input type="radio" name="registration" value="required" defaultChecked={registration === "required"} /> Yes, they RSVP on the events page</label>
          </fieldset>
          <div className="row-2">
            <label className="field"><span>Capacity <small>Empty for no limit. When full, new sign-ups join the waitlist.</small></span><input type="number" name="capacity" min={1} max={5000} defaultValue={capacity ?? ""} /></label>
            <div className="form">
              <label className="check"><input type="checkbox" name="rsvpOpen" defaultChecked={rsvpOpen ?? true} /> RSVPs are open</label>
              <label className="check"><input type="checkbox" name="feeRequired" defaultChecked={Boolean(feeRequired)} /> A fee is paid by QR before the day (track it per person)</label>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
