"use client";

import { useEffect, useRef, useState } from "react";
import { searchPlaces } from "../../eventTools";
import { MAX_HASHTAGS, PHOTO_UPLOADERS, isPastDate, manilaDate, parseHashtags } from "../../../lib/admin/events.mjs";
import { MAX_TIERS, cleanTiers, priceSummary } from "../../../lib/prices.mjs";

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

/**
 * Hashtags as badges: type one and press Enter, space or comma (pasting
 * several works too). Each badge has its own remove button; Backspace in the
 * empty box removes the last one.
 */
export function HashtagField({ hashtags }) {
  const [tags, setTags] = useState(hashtags || []);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("");
  const input = useRef(null);
  const full = tags.length >= MAX_HASHTAGS;

  function commit(text) {
    const words = String(text).split(/[\s,#]+/).filter(Boolean);
    const next = parseHashtags([...tags, ...words]);
    const added = next.length - tags.length;
    if (words.length && added < words.length) {
      setNote(next.length >= MAX_HASHTAGS ? `Up to ${MAX_HASHTAGS} hashtags; the rest weren't added.` : "Already added.");
    } else {
      setNote("");
    }
    setTags(next);
    setDraft("");
  }

  function remove(tag) {
    setTags(tags.filter((t) => t !== tag));
    setNote(`Removed #${tag}.`);
    input.current?.focus();
  }

  return (
    <div className="field">
      <label htmlFor="hashtag-input" className="field-head">Hashtags <small>Optional. Up to {MAX_HASHTAGS}, shown on the event and added when it's shared</small></label>
      <div className="tag-input" onClick={() => input.current?.focus()}>
        {tags.map((tag) => (
          <span key={tag} className="tag-badge">
            #{tag}
            <button type="button" onClick={(e) => { e.stopPropagation(); remove(tag); }} aria-label={`Remove #${tag}`}>×</button>
          </span>
        ))}
        {!full && (
          <input
            id="hashtag-input"
            ref={input}
            type="text"
            value={draft}
            maxLength={120}
            placeholder={tags.length ? "Add another" : "#PawsForAPurpose"}
            onChange={(e) => {
              const value = e.target.value;
              if (/[\s,]$/.test(value)) commit(value);
              else setDraft(value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (draft.trim()) commit(draft);
              } else if (e.key === "Backspace" && !draft && tags.length) {
                remove(tags[tags.length - 1]);
              }
            }}
            onBlur={() => draft.trim() && commit(draft)}
            onPaste={(e) => {
              e.preventDefault();
              commit(`${draft} ${e.clipboardData.getData("text")}`);
            }}
          />
        )}
      </div>
      <input type="hidden" name="hashtags" value={tags.map((t) => `#${t}`).join(" ")} />
      <p className="small muted" role="status" aria-live="polite">{note || (full ? `That's the most an event can have (${MAX_HASHTAGS}).` : "Press Enter after each one.")}</p>
    </div>
  );
}

function osmEmbed(lat, lng) {
  const d = 0.004;
  const bbox = [lng - d * 1.6, lat - d, lng + d * 1.6, lat + d].map((n) => n.toFixed(5)).join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
}

/**
 * Where: one search box first. Picking a place fills Venue and City (both
 * still editable) and pins the spot. Typing it in by hand and the Google Maps
 * link are a click away rather than three more boxes up front.
 */
export function VenueField({ venue, city, lat, lng, mapUrl }) {
  const [values, setValues] = useState({ venue: venue || "", city: city || "" });
  const [pin, setPin] = useState(Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null);
  const [manual, setManual] = useState(Boolean(venue || city));
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
      else if (!places.length) setMessage("Nothing found. Try a shorter name, or type the venue in yourself.");
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
    setManual(true);
    setResults(null);
    setQuery("");
    setMessage(`Pinned: ${place.address}`);
  }

  return (
    <div className="form" style={{ gap: 12 }}>
      <div className="venue-search">
        <label className="field" style={{ flex: 1 }}>
          <span>{manual ? "Search the map again" : "Venue"} <small>A place name, a plus code (H4XX+2V Makati) or coordinates</small></span>
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
            placeholder="e.g. Parklinks Pet Park"
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
      {manual ? (
        <div className="row-2">
          <label className="field"><span>Venue name <small>As people know it</small></span>
            <input type="text" name="venue" maxLength={160} value={values.venue} onChange={(e) => setValues({ ...values, venue: e.target.value })} />
          </label>
          <label className="field"><span>City</span>
            <input type="text" name="city" maxLength={80} value={values.city} onChange={(e) => setValues({ ...values, city: e.target.value })} />
          </label>
        </div>
      ) : (
        <>
          <input type="hidden" name="venue" value={values.venue} />
          <input type="hidden" name="city" value={values.city} />
          <p className="small"><button type="button" className="linkish" onClick={() => setManual(true)}>Type the venue in instead</button></p>
        </>
      )}
      {pin && (
        <div className="venue-pin">
          <iframe title="Pinned location" src={osmEmbed(pin.lat, pin.lng)} loading="lazy" />
          <button type="button" className="linkish" onClick={() => { setPin(null); setMessage("Pin removed."); }}>Remove pin</button>
        </div>
      )}
      <input type="hidden" name="venueLat" value={pin ? pin.lat : ""} />
      <input type="hidden" name="venueLng" value={pin ? pin.lng : ""} />
      <details className="disclosure" open={Boolean(mapUrl)}>
        <summary>Google Maps link <span className="muted">optional</span></summary>
        <label className="field">
          <span>Paste the link <small>In Google Maps, tap Share on the place. "Get directions" then opens exactly that place.</small></span>
          <input type="text" inputMode="url" name="mapUrl" maxLength={500} defaultValue={mapUrl || ""} placeholder="https://maps.app.goo.gl/…" />
        </label>
      </details>
    </div>
  );
}

/** Peso tiers. "Free" is one tier at ₱0; "Paid" lists as many as the event has. */
export function PriceField({ tiers, legacyCost }) {
  const initialMode = tiers?.length ? (tiers.every((t) => t.amount === 0) ? "free" : "paid") : legacyCost ? "paid" : "";
  const [mode, setMode] = useState(initialMode);
  const [rows, setRows] = useState(
    tiers?.length && initialMode === "paid" ? tiers.map((t) => ({ label: t.label, amount: String(t.amount) })) : [{ label: "", amount: "" }],
  );
  const sent = mode === "free" ? [{ label: "", amount: 0 }] : mode === "paid" ? rows : [];
  const parsed = cleanTiers(sent);
  const summary = parsed.tiers ? priceSummary(parsed.tiers) : null;
  const update = (i, patch) => setRows(rows.map((row, j) => (j === i ? { ...row, ...patch } : row)));

  return (
    <div className="form" style={{ gap: 10 }}>
      <fieldset className="plain">
        <legend>Price</legend>
        <div className="segmented" role="radiogroup" aria-label="Price">
          {[["free", "Free"], ["paid", "Paid"]].map(([key, label]) => (
            <label key={key} className={mode === key ? "is-on" : undefined}>
              <input type="radio" name="priceMode" value={key} checked={mode === key} onChange={() => setMode(key)} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      {mode === "paid" && (
        <>
          {legacyCost && !tiers?.length && <p className="small muted">It used to say "{legacyCost}". Enter it as prices below.</p>}
          <ul className="tier-list">
            {rows.map((row, i) => (
              <li key={i}>
                <label className="field">
                  <span className={i ? "visually-hidden" : undefined}>Tier name <small>Optional, e.g. Early bird</small></span>
                  <input type="text" value={row.label} maxLength={40} onChange={(e) => update(i, { label: e.target.value })} placeholder={rows.length > 1 ? `Tier ${i + 1}` : "Regular"} aria-label={`Tier ${i + 1} name`} />
                </label>
                <label className="field">
                  <span className={i ? "visually-hidden" : undefined}>Amount</span>
                  <span className="peso-input">
                    <span aria-hidden="true">₱</span>
                    <input type="text" inputMode="decimal" value={row.amount} onChange={(e) => update(i, { amount: e.target.value })} placeholder="500" aria-label={`Tier ${i + 1} amount in pesos`} />
                  </span>
                </label>
                {rows.length > 1 && (
                  <button type="button" className="tier-remove" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label={`Remove tier ${i + 1}`}>×</button>
                )}
              </li>
            ))}
          </ul>
          {rows.length < MAX_TIERS && (
            <p className="small"><button type="button" className="linkish" onClick={() => setRows([...rows, { label: "", amount: "" }])}>+ Add a price tier</button></p>
          )}
        </>
      )}
      <p className="small muted" role="status">
        {parsed.error ? parsed.error : summary ? <>Shown on the card as <strong>{summary}</strong>{parsed.tiers.length > 1 ? "; the event page lists every tier." : "."}</> : "No price shown until you choose."}
      </p>
      <input type="hidden" name="priceTiers" value={JSON.stringify(sent)} />
      {/* An old free-text price stays until it's re-entered as tiers. */}
      <input type="hidden" name="cost" value={mode === "paid" && !parsed.tiers?.length ? legacyCost || "" : ""} />
    </div>
  );
}

/**
 * Sign-ups. They follow the Date field in the same form: an event dated
 * before today is a record of what happened (details and photos), so the
 * settings give way to a note. The server enforces the same rule. The extra
 * settings appear only once sign-ups are switched on.
 */
export function SignupFields({ registration, capacity, rsvpOpen, feeRequired, date }) {
  const ref = useRef(null);
  const [past, setPast] = useState(isPastDate(date || ""));
  const [on, setOn] = useState(registration === "required");
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    const formEl = ref.current?.closest("form");
    const input = formEl?.querySelector('input[name="date"]');
    if (!input) return undefined;
    const update = () => setPast(isPastDate(input.value, manilaDate()));
    const price = () => setPaid(formEl.querySelector('input[name="priceMode"][value="paid"]')?.checked || false);
    update();
    price();
    input.addEventListener("input", update);
    input.addEventListener("change", update);
    formEl.addEventListener("change", price);
    return () => {
      input.removeEventListener("input", update);
      input.removeEventListener("change", update);
      formEl.removeEventListener("change", price);
    };
  }, []);

  if (past) {
    return (
      <p className="banner note small" role="status" ref={ref}>
        This date has passed, so this is a past event: no RSVPs or sign-ups. Once published it appears under "Where we have been" on the events page, with its details and photos.
      </p>
    );
  }
  return (
    <div className="form" style={{ gap: 12 }} ref={ref}>
      <label className="switch">
        <input type="checkbox" name="registration" value="required" checked={on} onChange={(e) => setOn(e.target.checked)} />
        <span><strong>People RSVP on the events page</strong><small>Off: anyone can just come along.</small></span>
      </label>
      {on ? (
        <div className="row-2 indent">
          <label className="field"><span>Capacity <small>Empty for no limit. When full, new sign-ups join the waitlist.</small></span><input type="number" name="capacity" min={1} max={5000} defaultValue={capacity ?? ""} /></label>
          <div className="form">
            <label className="check"><input type="checkbox" name="rsvpOpen" defaultChecked={rsvpOpen ?? true} /> RSVPs are open</label>
            {paid && <label className="check"><input type="checkbox" name="feeRequired" defaultChecked={Boolean(feeRequired)} /> They pay by QR before the day (track it per person)</label>}
          </div>
        </div>
      ) : (
        <>
          {/* Kept as they were, for when sign-ups are switched back on. */}
          <input type="hidden" name="capacity" value={capacity ?? ""} />
          {(rsvpOpen ?? true) && <input type="hidden" name="rsvpOpen" value="on" />}
        </>
      )}
      {!(on && paid) && feeRequired && <input type="hidden" name="feeRequired" value="on" />}
    </div>
  );
}

/** Settings most events never touch: the web address, and who may add photos later. */
export function MoreOptions({ slug, photoUploads }) {
  const [allow, setAllow] = useState(Boolean(photoUploads?.length));
  return (
    <details className="card disclosure-card">
      <summary><h2>More options</h2><span className="small muted">{slug ? "Web address, " : ""}photos from guests</span></summary>
      <div className="form" style={{ gap: 18, marginTop: 16 }}>
        {slug && (
          <label className="field"><span>Web address <small>The end of this event's link. You can change it; the old link keeps working and goes to the new one.</small></span>
            <span className="slug-field">
              <span className="slug-prefix" aria-hidden="true">events.houseofretrieversph.org/</span>
              <input type="text" name="slug" required minLength={3} maxLength={80} defaultValue={slug} spellCheck={false} autoCapitalize="none" aria-describedby="slug-help" />
            </span>
            <small id="slug-help" className="muted">Lowercase letters, numbers and dashes. Spaces become dashes when you save.</small>
          </label>
        )}
        <div className="form" style={{ gap: 10 }}>
          <label className="switch">
            <input type="checkbox" checked={allow} onChange={(e) => setAllow(e.target.checked)} />
            <span><strong>Let people add their own photos to the album</strong><small>Starts working when the member portal opens. Admins approve each photo before it shows. Admins can always add photos.</small></span>
          </label>
          {allow && (
            <fieldset className="plain indent">
              <legend className="small">Who can add photos</legend>
              <div className="check-row">
                {PHOTO_UPLOADERS.map(([key, label]) => (
                  <label key={key} className="check"><input type="checkbox" name="photoUploads" value={key} defaultChecked={photoUploads?.length ? photoUploads.includes(key) : ["attendees", "members"].includes(key)} /> {label}</label>
                ))}
              </div>
            </fieldset>
          )}
          <input type="hidden" name="photoUploadsSent" value="1" />
        </div>
      </div>
    </details>
  );
}
