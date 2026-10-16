"use client";

import { useEffect, useRef, useState } from "react";
import { searchPlaces } from "../../eventTools";
import { CONSENT_TEMPLATES, MAX_HASHTAGS, MAX_SUPPORTERS, PHOTO_UPLOADERS, RSVP_FORM_DEFAULT, cleanNames, cleanRsvpFormConfig, isPastDate, manilaDate, parseHashtags } from "../../../lib/admin/events.mjs";
import { PRICING_BASES, ticketLimitUnitLabel } from "../../../lib/registrationPricing.mjs";
import { MAX_TIERS, activeTiers, cleanTiers, parsePeso, priceSummary, tierKey, tierLeft, tierWindow } from "../../../lib/prices.mjs";
import { formatOpens, manilaInstant, manilaParts, opensLater } from "../../../lib/rsvpOpens.mjs";

/**
 * Date and times. "All day" hides the times (and saves none), for events
 * like a vaccination drive or a weekend bazaar that run through the day.
 */
export function WhenFields({ date, allDay, startTime, endTime }) {
  const [whole, setWhole] = useState(Boolean(allDay));
  return (
    <div className="form" style={{ gap: 10 }}>
      <div className="row-3">
        <label className="field"><span>Date</span><input type="date" name="date" required defaultValue={date} /></label>
        {!whole && (
          <>
            <label className="field"><span>Starts</span><input type="time" name="startTime" defaultValue={startTime || ""} /></label>
            <label className="field"><span>Ends</span><input type="time" name="endTime" defaultValue={endTime || ""} /></label>
          </>
        )}
      </div>
      <label className="check">
        <input type="checkbox" name="allDay" checked={whole} onChange={(e) => setWhole(e.target.checked)} /> All-day event <span className="small muted">No start or end time; shown as "All day"</span>
      </label>
      <input type="hidden" name="allDaySent" value="1" />
    </div>
  );
}

/**
 * Partners or sponsors as name badges. Pick from the Partners and Sponsors
 * in People (suggested as you type) or type any name and press Enter.
 */
export function SupportersField({ name, label, hint, initial, suggestions = [] }) {
  const [names, setNames] = useState(initial || []);
  const [draft, setDraft] = useState("");
  const input = useRef(null);
  const full = names.length >= MAX_SUPPORTERS;
  const listId = `${name}-suggestions`;

  function add(text) {
    setNames(cleanNames([...names, text]));
    setDraft("");
  }

  return (
    <div className="field">
      <label htmlFor={`${name}-input`} className="field-head">{label} <small>{hint}</small></label>
      <div className="tag-input" onClick={() => input.current?.focus()}>
        {names.map((n) => (
          <span key={n} className="tag-badge">
            {n}
            <button type="button" onClick={(e) => { e.stopPropagation(); setNames(names.filter((x) => x !== n)); input.current?.focus(); }} aria-label={`Remove ${n}`}>×</button>
          </span>
        ))}
        {!full && (
          <input
            id={`${name}-input`}
            ref={input}
            type="text"
            list={suggestions.length ? listId : undefined}
            value={draft}
            maxLength={80}
            placeholder={names.length ? "Add another" : "Type a name"}
            onChange={(e) => {
              const value = e.target.value;
              // Picking from the list fills the whole name at once.
              if (suggestions.includes(value)) add(value);
              else setDraft(value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (draft.trim()) add(draft);
              } else if (e.key === "Backspace" && !draft && names.length) {
                setNames(names.slice(0, -1));
              }
            }}
            onBlur={() => draft.trim() && add(draft)}
          />
        )}
      </div>
      {suggestions.length > 0 && (
        <datalist id={listId}>
          {suggestions.filter((sug) => !names.some((n) => n.toLowerCase() === sug.toLowerCase())).map((sug) => <option key={sug} value={sug} />)}
        </datalist>
      )}
      <input type="hidden" name={name} value={JSON.stringify(names)} />
      <p className="small muted">{full ? `That's the most an event can list (${MAX_SUPPORTERS}).` : "Press Enter after each name."}</p>
    </div>
  );
}

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
          <span>Beneficiary <small>Who the event supports, named up front, e.g. a shelter or a rescue group. Not confirmed yet? Leave the box unticked for now.</small></span>
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
export function VenueField({ venue, city, address, lat, lng, mapUrl }) {
  const [values, setValues] = useState({ venue: venue || "", city: city || "", address: address || "" });
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
    // The name people know goes in Venue; the rest of the address on its own line.
    const rest = String(place.address || "").split(",").map((p) => p.trim()).filter((p) => p && p !== place.name).slice(0, 3).join(", ");
    setValues({ venue: place.name, city: place.city || values.city, address: rest });
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
      ) : null}
      {manual && (
        <label className="field"><span>Address <small>Optional. Street and area, shown smaller under the venue name</small></span>
          <input type="text" name="venueAddress" maxLength={200} value={values.address} onChange={(e) => setValues({ ...values, address: e.target.value })} placeholder="e.g. Diosdado Macapagal Blvd" />
        </label>
      )}
      {manual && values.city && values.venue.toLowerCase().includes(values.city.toLowerCase()) && (
        <p className="small muted" role="status">The city shows on its own; you can leave "{values.city}" out of the venue name.</p>
      )}
      {!manual && (
        <>
          <input type="hidden" name="venue" value={values.venue} />
          <input type="hidden" name="city" value={values.city} />
          <input type="hidden" name="venueAddress" value={values.address} />
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
/** "On sale until Oct 10, 11:59 PM, then it disappears from the RSVP." */
function periodNote(tier) {
  if (!tier.from && !tier.until) return "Pick an end date (and a start date if it starts later). Without a time, it ends at 11:59 PM.";
  const window = tierWindow(tier);
  if (window.startsWith("Ended")) return `${window}: it's no longer offered on the RSVP, and the event page shows it as ended.`;
  return `${window ? `${window}. ` : ""}Outside its period it isn't offered on the RSVP; the card shows the prices on sale.`;
}

/** "12 of 20 taken so far. Cancelled registrations free their place." */
function limitNote(row, counts = {}, basis = "registration") {
  const n = Number(row.limit);
  if (!Number.isInteger(n) || n < 1) return "Type how many registrants get this price.";
  const taken = counts[tierKey({ label: row.label.trim().replace(/\s+/g, " "), amount: parsePeso(row.amount) ?? NaN })] || 0;
  return `${taken} of ${n} ${ticketLimitUnitLabel(basis, row)} taken so far. Pending payments and the waitlist count; a cancelled registration frees its place. Once all ${n} are taken it isn't offered on the RSVP.`;
}

function tierPreview(row, basis, counts) {
  const amount = parsePeso(row.amount);
  if (amount == null) return "Enter an amount to preview this tier.";
  const tier = { label: row.label.trim().replace(/\s+/g, " "), amount, limit: row.limited && row.limit !== "" ? Number(row.limit) : null, until: row.dated ? manilaInstant(row.until.date, row.until.time || "23:59") : null, attendanceBasis: row.attendanceBasis };
  const parts = [`₱${amount.toLocaleString("en-PH")}`];
  if (tier.limit) {
    const unit = ticketLimitUnitLabel(basis, row);
    const left = tierLeft(tier, counts);
    parts.push(`First ${tier.limit} ${unit} · ${left} left`);
  }
  if (tier.until) parts.push(`Until ${tierWindow(tier).replace(/^Until /, "")}`);
  return parts.join(" · ");
}

export function PriceField({ tiers, legacyCost, counts = {}, pricingBasis = "registration", includedFurbabiesPerHuman = 0, additionalFurbabyFee = 0 }) {
  const initialMode = tiers?.length ? (tiers.every((t) => t.amount === 0) ? "free" : "paid") : legacyCost ? "paid" : "";
  const [mode, setMode] = useState(initialMode);
  // Each row may have a sale period (an early bird rate): Manila date + time for "from" and "until".
  const blank = { label: "", amount: "", bundleHumans: "1", bundleFurbabies: "1", attendanceBasis: "human_only", includedHumansPerFurbaby: "2", additionalHumanFee: "100", dated: false, from: { date: "", time: "" }, until: { date: "", time: "" }, limited: false, limit: "" };
  const [basis, setBasis] = useState(pricingBasis);
  const [includedDogs, setIncludedDogs] = useState(String(includedFurbabiesPerHuman));
  const [extraDogFee, setExtraDogFee] = useState(additionalFurbabyFee ? String(additionalFurbabyFee) : "");
  const [rows, setRows] = useState(
    tiers?.length && initialMode === "paid"
      ? tiers.map((t) => ({ label: t.label, amount: String(t.amount), bundleHumans: String(t.bundleHumans ?? 1), bundleFurbabies: String(t.bundleFurbabies ?? 1), attendanceBasis: t.attendanceBasis ?? "human_only", includedHumansPerFurbaby: String(t.includedHumansPerFurbaby ?? 2), additionalHumanFee: String(t.additionalHumanFee ?? 100), dated: Boolean(t.from || t.until), from: manilaParts(t.from), until: manilaParts(t.until), limited: Boolean(t.limit), limit: t.limit ? String(t.limit) : "" }))
      : [blank],
  );
  const toSend = (row) => ({
    label: row.label,
    amount: row.amount,
    ...(basis === "bundle" ? { bundleHumans: row.bundleHumans, bundleFurbabies: row.bundleFurbabies } : {}),
    ...(basis === "tiered" ? { attendanceBasis: row.attendanceBasis, includedHumansPerFurbaby: row.includedHumansPerFurbaby, additionalHumanFee: row.additionalHumanFee } : {}),
    from: row.dated ? manilaInstant(row.from.date, row.from.time || "00:00") : null,
    until: row.dated ? manilaInstant(row.until.date, row.until.time || "23:59") : null,
    limit: row.limited && row.limit !== "" ? row.limit : null,
  });
  const sent = mode === "free" ? [{ label: "", amount: 0 }] : mode === "paid" ? rows.map(toSend) : [];
  const parsed = cleanTiers(sent, { pricingBasis: basis });
  const dated = parsed.tiers?.some((t) => t.from || t.until || t.limit);
  const summary = parsed.tiers ? priceSummary(dated ? activeTiers(parsed.tiers, Date.now(), counts) : parsed.tiers) : null;
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
      <label className="field"><span>How is the price counted? <small>Existing events stay per registration unless you change this.</small></span>
        <select name="pricingBasis" value={basis} onChange={(e) => setBasis(e.target.value)}>
          {PRICING_BASES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </label>
      {basis === "tiered" && <p className="small muted" style={{ margin: 0 }}>Set the rule on each ticket below: Hooman only charges per person and cannot include a furbaby. A Furbaby package charges per dog, includes a set number of people, then adds an extra-person fee.</p>}
      {basis === "human_plus_furbaby" && <div className="card inset form" style={{ gap: 10 }}>
        <strong>Dog companion pricing</strong>
        <p className="small muted" style={{ margin: 0 }}>Each human ticket includes the number of furbabies below. Additional furbabies use the extra fee.</p>
        <div className="row-2">
          <label className="field"><span>Included per person</span><input type="number" min={0} max={100} value={includedDogs} onChange={(e) => setIncludedDogs(e.target.value)} /></label>
          <label className="field"><span>Extra furbaby fee <small>Optional</small></span><input type="text" inputMode="decimal" value={extraDogFee} onChange={(e) => setExtraDogFee(e.target.value)} placeholder="0" /></label>
        </div>
        <input type="hidden" name="includedFurbabiesPerHuman" value={includedDogs} />
        <input type="hidden" name="additionalFurbabyFee" value={extraDogFee} />
      </div>}
      {mode === "paid" && (
        <>
          {legacyCost && !tiers?.length && <p className="small muted">It used to say "{legacyCost}". Enter it as prices below.</p>}
          <ul className="tier-list">
            {rows.map((row, i) => (
              <li key={i}>
                <div className="tier-main">
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
                </div>
                <p className="tier-preview" role="status">{tierPreview(row, basis, counts)}</p>
                {basis === "bundle" && <div className="tier-rule row-2">
                  <label className="field"><span>People included</span><input type="number" min={0} max={100} value={row.bundleHumans} onChange={(e) => update(i, { bundleHumans: e.target.value })} /></label>
                  <label className="field"><span>Furbabies included</span><input type="number" min={0} max={100} value={row.bundleFurbabies} onChange={(e) => update(i, { bundleFurbabies: e.target.value })} /></label>
                </div>}
                {basis === "tiered" && <div className="card inset form" style={{ gap: 10 }}>
                  <label className="field"><span>Ticket rule</span>
                    <select value={row.attendanceBasis} onChange={(e) => update(i, { attendanceBasis: e.target.value })} aria-label={`Tier ${i + 1} ticket rule`}>
                      <option value="human_only">Hooman only — charge each person; no furbabies</option>
                      <option value="furbaby_package">Furbaby package — people included with each furbaby</option>
                    </select>
                  </label>
                  {row.attendanceBasis === "furbaby_package" && <div className="row-2">
                    <label className="field"><span>People included per furbaby</span><input type="number" min={1} max={100} value={row.includedHumansPerFurbaby} onChange={(e) => update(i, { includedHumansPerFurbaby: e.target.value })} /></label>
                    <label className="field"><span>Extra-person fee</span><input type="text" inputMode="decimal" value={row.additionalHumanFee} onChange={(e) => update(i, { additionalHumanFee: e.target.value })} placeholder="100" /></label>
                  </div>}
                </div>}
                <div className="tier-period">
                  <label className="check small">
                    <input type="checkbox" checked={row.dated} onChange={(e) => update(i, { dated: e.target.checked })} />
                    <span>Sale period <span className="muted">e.g. an early bird rate that ends on a date</span></span>
                  </label>
                  {row.dated && (
                    <div className="tier-period-fields">
                      <label className="field"><span>From <small>Optional</small></span>
                        <span className="tier-period-pair">
                          <input type="date" value={row.from.date} onChange={(e) => update(i, { from: { ...row.from, date: e.target.value } })} aria-label={`Tier ${i + 1} on sale from date`} />
                          <input type="time" value={row.from.time} onChange={(e) => update(i, { from: { ...row.from, time: e.target.value } })} aria-label={`Tier ${i + 1} on sale from time`} />
                        </span>
                      </label>
                      <label className="field"><span>Until <small>Manila time</small></span>
                        <span className="tier-period-pair">
                          <input type="date" value={row.until.date} onChange={(e) => update(i, { until: { ...row.until, date: e.target.value } })} aria-label={`Tier ${i + 1} on sale until date`} />
                          <input type="time" value={row.until.time} onChange={(e) => update(i, { until: { ...row.until, time: e.target.value } })} aria-label={`Tier ${i + 1} on sale until time`} />
                        </span>
                      </label>
                      <p className="small muted tier-period-note">{periodNote(toSend(row))}</p>
                    </div>
                  )}
                  <label className="check small">
                    <input type="checkbox" checked={row.limited} onChange={(e) => update(i, { limited: e.target.checked })} />
                    <span>Only for the first {ticketLimitUnitLabel(basis, row)} <span className="muted">e.g. an early bird for the first 20; after that, people take the other prices</span></span>
                  </label>
                  {row.limited && (
                    <div className="tier-period-fields">
                      <label className="field"><span>How many</span>
                        <input type="number" min={1} max={5000} value={row.limit} onChange={(e) => update(i, { limit: e.target.value })} placeholder="20" aria-label={`Tier ${i + 1}: number of registrants`} />
                      </label>
                      <p className="small muted tier-period-note">{limitNote(row, counts, basis)}</p>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {rows.length < MAX_TIERS && (
            <p className="small"><button type="button" className="linkish" onClick={() => setRows([...rows, blank])}>+ Add a price tier</button></p>
          )}
        </>
      )}
      <p className="small muted" role="status">
        {parsed.error ? parsed.error : summary ? <>Shown on the card as <strong>{summary}</strong>{dated ? " right now (prices outside their sale period, or already taken, drop off by themselves)" : ""}{parsed.tiers.length > 1 ? "; the event page lists every tier." : "."}</> : "No price shown until you choose."}
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
export function SignupFields({ registration, capacity, rsvpOpen, rsvpLabel, vaccinationRecordRequired, feeRequired, onsitePayment, date, rsvpOpensAt, rsvpFormConfig }) {
  const ref = useRef(null);
  const opensParts = manilaParts(rsvpOpensAt);
  const [scheduled, setScheduled] = useState(Boolean(rsvpOpensAt));
  const [opens, setOpens] = useState(opensParts);
  const [past, setPast] = useState(isPastDate(date || ""));
  const [on, setOn] = useState(registration === "required");
  const [open, setOpen] = useState(rsvpOpen ?? true);
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
            <input type="hidden" name="rsvpOpenSent" value="1" />
            <label className="switch"><input type="checkbox" name="rsvpOpen" checked={open} onChange={(e) => setOpen(e.target.checked)} /><span><strong>Registration is open</strong><small>Switch off to close RSVP while keeping the event page visible.</small></span></label>
            {paid && <>
              <label className="check"><input type="checkbox" name="feeRequired" defaultChecked={Boolean(feeRequired)} /> They pay by QR before the day (track it per person)</label>
              {feeRequired && <label className="check"><input type="checkbox" name="onsitePayment" defaultChecked={Boolean(onsitePayment)} /> On-site payment is available <span className="small muted">The regular rate applies on site; leave this off until the venue confirms.</span></label>}
            </>}
          </div>
          <label className="field indent-full"><span>RSVP button label <small>Optional. For example, “Reserve my spot”. The usual “RSVP” stays when this is empty.</small></span><input name="rsvpLabel" maxLength={40} defaultValue={rsvpLabel || ""} placeholder="RSVP" /></label>
          <label className="switch indent-full"><input type="checkbox" name="vaccinationRecordRequired" defaultChecked={Boolean(vaccinationRecordRequired)} /><span><strong>Show an optional vaccination record upload</strong><small>Use this only when the event asks participants for a vaccination card. The photo is optional and only authorised admins can view it.</small></span></label>
          <RsvpFormSettings initial={rsvpFormConfig} vaccinationRecordRequired={vaccinationRecordRequired} />
          <div className="form indent-full" style={{ gap: 10 }}>
            <input type="hidden" name="rsvpOpensSent" value="1" />
            <label className="check">
              <input type="checkbox" name="rsvpOpensOn" checked={scheduled} onChange={(e) => setScheduled(e.target.checked)} />
              <span><strong>Open RSVPs at a set time</strong> <span className="small muted">The events page counts down to it, then the RSVP button appears by itself.</span></span>
            </label>
            {scheduled && (
              <div className="row-2">
                <label className="field"><span>Opens on</span><input type="date" name="rsvpOpensDate" required value={opens.date} onChange={(e) => setOpens((o) => ({ ...o, date: e.target.value }))} /></label>
                <label className="field"><span>At <small>Manila time</small></span><input type="time" name="rsvpOpensTime" required value={opens.time} onChange={(e) => setOpens((o) => ({ ...o, time: e.target.value }))} /></label>
              </div>
            )}
            {scheduled && opens.date && opens.time && <p className="small muted" style={{ margin: 0 }}>RSVPs open {formatOpens(manilaInstant(opens.date, opens.time))} (Manila). {opensLater(manilaInstant(opens.date, opens.time)) ? "Until then the RSVP button shows a countdown." : "That time has passed, so RSVPs are open now."}</p>}
          </div>
        </div>
      ) : (
        <>
          {/* Kept as they were, for when sign-ups are switched back on. */}
          <input type="hidden" name="capacity" value={capacity ?? ""} />
          <input type="hidden" name="rsvpOpenSent" value="1" />
          {(rsvpOpen ?? true) && <input type="hidden" name="rsvpOpen" value="on" />}
          <input type="hidden" name="rsvpLabel" value={rsvpLabel || ""} />
          {vaccinationRecordRequired && <input type="hidden" name="vaccinationRecordRequired" value="on" />}
          {/* A scheduled opening stays saved while sign-ups are off. */}
        </>
      )}
      {!(on && paid) && feeRequired && <input type="hidden" name="feeRequired" value="on" />}
    </div>
  );
}

export function RsvpFormSettings({ initial, vaccinationRecordRequired }) {
  const parsed = cleanRsvpFormConfig(initial || RSVP_FORM_DEFAULT);
  const startingOptional = vaccinationRecordRequired && !parsed.optional.includes("vaccination") ? [...parsed.optional, "vaccination"] : parsed.optional;
  const [optional, setOptional] = useState(startingOptional);
  const [order, setOrder] = useState(parsed.order);
  const [consentEnabled, setConsentEnabled] = useState(Boolean(initial?.consentEnabled));
  const [consentRequiredBeforeCheckin, setConsentRequiredBeforeCheckin] = useState(Boolean(initial?.consentRequiredBeforeCheckin));
  const [consentIntro, setConsentIntro] = useState(initial?.consentIntro || "Please review the event safety and consent notes, then confirm your registered name.");
  const [consentTemplate, setConsentTemplate] = useState(initial?.consentTemplate || "simple");
  const labels = { identity: "Name, email and furbaby name", attendees: "Hoomans and furbabies", photoConsent: "Photo consent", under18: "Age and guardian", vaccination: "Vaccination record" };
  const move = (key, direction) => setOrder((current) => { const index = current.indexOf(key); const next = index + direction; if (index < 0 || next < 0 || next >= current.length) return current; const copy = [...current]; [copy[index], copy[next]] = [copy[next], copy[index]]; return copy; });
  const toggle = (key) => setOptional((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  return <fieldset className="rsvp-form-settings indent-full"><legend>Participant form</legend><p className="small muted">Required identity and attendee details stay in the form. Choose optional questions, then arrange the blocks with the arrows.</p><div className="check-row">{["photoConsent", "under18", "vaccination"].map((key) => <label key={key} className="check"><input type="checkbox" checked={optional.includes(key)} disabled={key === "vaccination" && !vaccinationRecordRequired} onChange={() => toggle(key)} /> {labels[key]}{key === "vaccination" && !vaccinationRecordRequired ? " (turn it on above first)" : ""}</label>)}</div><ol className="rsvp-order-list">{order.filter((key) => key === "identity" || key === "attendees" || optional.includes(key)).map((key, index, list) => <li key={key}><span>{labels[key]}{key === "identity" || key === "attendees" ? " · required" : ""}</span><span><button type="button" className="linkish" disabled={index === 0} onClick={() => move(key, -1)} aria-label={`Move ${labels[key]} up`}>↑</button><button type="button" className="linkish" disabled={index === list.length - 1} onClick={() => move(key, 1)} aria-label={`Move ${labels[key]} down`}>↓</button></span></li>)}</ol><label className="switch"><input type="checkbox" checked={consentEnabled} onChange={(e) => setConsentEnabled(e.target.checked)} /><span><strong>Add an event acknowledgement</strong><small>Participants complete it from their private RSVP page. No extra email is sent.</small></span></label>{consentEnabled && <><label className="field"><span>Starting template</span><select value={consentTemplate} onChange={(e) => setConsentTemplate(e.target.value)}>{Object.entries(CONSENT_TEMPLATES).map(([key, template]) => <option key={key} value={key}>{template.label}</option>)}</select></label><label className="field"><span>Acknowledgement introduction <small>Optional. Do not add legal wording unless HOR has approved it.</small></span><textarea maxLength={1000} value={consentIntro} onChange={(e) => setConsentIntro(e.target.value)} rows={3} /></label><label className="switch"><input type="checkbox" checked={consentRequiredBeforeCheckin} onChange={(e) => setConsentRequiredBeforeCheckin(e.target.checked)} /><span><strong>Require it before check-in</strong><small>The QR still works and the registration stays confirmed; the door team will ask them to complete it first.</small></span></label></>}<input type="hidden" name="rsvpFormConfig" value={JSON.stringify({ optional, order, consentEnabled, consentIntro, consentRequiredBeforeCheckin, consentTemplate })} /></fieldset>;
}

export function CheckinSettings({ eventId, title, message, preset, hasCustomSound }) {
  const [sound, setSound] = useState(preset || "dazzle");
  const [data, setData] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  function pick(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["audio/mpeg", "audio/wav", "audio/x-wav", "audio/ogg"].includes(file.type)) return setError("Use an MP3, WAV or OGG file.");
    if (file.size > 512 * 1024) return setError("Keep the sound under 512 KB.");
    const reader = new FileReader();
    reader.onload = () => { setData(String(reader.result)); setName(file.name); setSound("custom"); setError(""); };
    reader.onerror = () => setError("That sound could not be read. Try another file.");
    reader.readAsDataURL(file);
  }
  return <details className="card disclosure-card">
    <summary><h2>Check-in experience</h2><span className="small muted">Success message and sound</span></summary>
    <div className="form" style={{ gap: 14, marginTop: 16 }}>
      <p className="small muted" style={{ margin: 0 }}>After a successful scan, the check-in team sees this message and hears the selected sound. Failed scans keep the standard warning tone.</p>
      <label className="field"><span>Success title</span><input name="checkinSuccessTitle" maxLength={120} defaultValue={title || "You’re checked in!"} /></label>
      <label className="field"><span>Success message <small>Optional</small></span><textarea name="checkinSuccessMessage" maxLength={300} rows={2} defaultValue={message || "Welcome in. Have a wonderful time together."} /></label>
      <label className="field"><span>Success sound</span><select name="checkinSoundPreset" value={sound} onChange={(e) => setSound(e.target.value)}><option value="dazzle">Dazzle · bright three-note chime</option><option value="celebration">Celebration · warm three-note chime</option><option value="soft">Soft confirm · subtle single tone</option><option value="silent">Silent</option>{(hasCustomSound || data) && <option value="custom">Uploaded sound{name ? ` · ${name}` : ""}</option>}</select></label>
      <label className="btn ghost small file-btn" style={{ width: "fit-content" }}>Upload a sound<input type="file" accept="audio/mpeg,audio/wav,audio/x-wav,audio/ogg" onChange={pick} hidden /></label>
      {hasCustomSound && <label className="check"><input type="checkbox" name="checkinSoundRemove" /> Remove the uploaded sound</label>}
      <input type="hidden" name="checkinSoundData" value={data} />
      {error && <p className="form-error" role="alert">{error}</p>}
      <p className="small muted">Custom sounds must be MP3, WAV or OGG and under 512 KB. Keep them short and use a sound you have permission to use.</p>
    </div>
  </details>;
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
