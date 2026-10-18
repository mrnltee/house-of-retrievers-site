"use client";

import { useEffect, useRef, useState } from "react";
import { searchPlaces } from "../../eventTools";
import { CONSENT_TEMPLATES, MAX_HASHTAGS, MAX_SUPPORTERS, PHOTO_UPLOADERS, RSVP_FORM_DEFAULT, cleanNames, cleanRsvpFormConfig, isPastDate, manilaDate, parseHashtags } from "../../../lib/admin/events.mjs";
import { PRICING_BASES, ticketLimitUnitLabel } from "../../../lib/registrationPricing.mjs";
import { MAX_TIERS, activeTiers, cleanTiers, parsePeso, priceSummary, tierKey, tierLeft, tierWindow } from "../../../lib/prices.mjs";
import { formatOpens, manilaInstant, manilaParts, opensLater } from "../../../lib/rsvpOpens.mjs";
import { MAX_PAYMENT_HOLD_MINUTES, PAYMENT_HOLD_OPTIONS, holdLabel, holdParts, isPresetHold } from "../../../lib/registrationHolds.mjs";
import { DEFAULT_WELCOME_MESSAGE } from "../../../lib/welcomePhoto.mjs";

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
  if (basis === "base_plus" && row.plusKind === "human_only") {
    parts[0] += " per hooman · no furbaby";
  } else if (basis === "base_plus") {
    const h = parsePeso(row.extraHumanFee || "0") || 0;
    const f = parsePeso(row.extraFurbabyFee || "0") || 0;
    parts[0] += ` for 1 hooman + 1 furbaby · +₱${h.toLocaleString("en-PH")} per extra hooman · +₱${f.toLocaleString("en-PH")} per extra furbaby`;
  }
  if (tier.limit) {
    const unit = ticketLimitUnitLabel(basis, row);
    const left = tierLeft(tier, counts);
    parts.push(`First ${tier.limit} ${unit} · ${left} left`);
  }
  if (tier.until) parts.push(`Until ${tierWindow(tier).replace(/^Until /, "")}`);
  return parts.join(" · ");
}

export function PriceField({ tiers, legacyCost, counts = {}, pricingBasis = "registration", includedFurbabiesPerHuman = 0, additionalFurbabyFee = 0, tiersInOrder = false }) {
  const initialMode = tiers?.length ? (tiers.every((t) => t.amount === 0) ? "free" : "paid") : legacyCost ? "paid" : "";
  const [mode, setMode] = useState(initialMode);
  // Each row may have a sale period (an early bird rate): Manila date + time for "from" and "until".
  const blank = { label: "", amount: "", bundleHumans: "1", bundleFurbabies: "1", attendanceBasis: "human_only", includedHumansPerFurbaby: "2", additionalHumanFee: "100", extraHumanFee: "", extraFurbabyFee: "", plusKind: "package", limitUnit: "registrations", withPrevious: false, dated: false, from: { date: "", time: "" }, until: { date: "", time: "" }, limited: false, limit: "" };
  const [basis, setBasis] = useState(pricingBasis);
  const [includedDogs, setIncludedDogs] = useState(String(includedFurbabiesPerHuman));
  const [extraDogFee, setExtraDogFee] = useState(additionalFurbabyFee ? String(additionalFurbabyFee) : "");
  const [rows, setRows] = useState(
    tiers?.length && initialMode === "paid"
      ? tiers.map((t) => ({ label: t.label, amount: String(t.amount), bundleHumans: String(t.bundleHumans ?? 1), bundleFurbabies: String(t.bundleFurbabies ?? 1), attendanceBasis: t.attendanceBasis ?? "human_only", includedHumansPerFurbaby: String(t.includedHumansPerFurbaby ?? 2), additionalHumanFee: String(t.additionalHumanFee ?? 100), extraHumanFee: t.extraHumanFee ? String(t.extraHumanFee) : "", extraFurbabyFee: t.extraFurbabyFee ? String(t.extraFurbabyFee) : "", plusKind: t.attendanceBasis === "human_only" ? "human_only" : "package", limitUnit: t.limitUnit || "registrations", withPrevious: Boolean(t.withPrevious), dated: Boolean(t.from || t.until), from: manilaParts(t.from), until: manilaParts(t.until), limited: Boolean(t.limit), limit: t.limit ? String(t.limit) : "" }))
      : [blank],
  );
  const toSend = (row) => ({
    label: row.label,
    amount: row.amount,
    ...(basis === "bundle" ? { bundleHumans: row.bundleHumans, bundleFurbabies: row.bundleFurbabies } : {}),
    ...(basis === "tiered" ? { attendanceBasis: row.attendanceBasis, includedHumansPerFurbaby: row.includedHumansPerFurbaby, additionalHumanFee: row.additionalHumanFee } : {}),
    ...(basis === "base_plus" ? row.plusKind === "human_only"
      ? { attendanceBasis: "human_only", withPrevious: row.withPrevious }
      : { extraHumanFee: row.extraHumanFee, extraFurbabyFee: row.extraFurbabyFee, limitUnit: row.limitUnit, withPrevious: row.withPrevious } : {}),
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
      {basis === "base_plus" && <p className="small muted" style={{ margin: 0 }}>Each ticket's amount covers 1 hooman and 1 furbaby. Set what each extra hooman and furbaby adds on every ticket below, e.g. Early Bird ₱1,750 + ₱900 per extra hooman + ₱850 per extra furbaby. A first-N limit counts registrations.</p>}
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
          <input type="hidden" name="tiersInOrderSent" value="1" />
          <label className="switch"><input type="checkbox" name="tiersInOrder" defaultChecked={tiersInOrder} /><span><strong>Offer prices in order</strong><small>The RSVP shows only the first price still on sale (e.g. Early Bird). The next one appears when it sells out or its sale period ends, with a note saying what comes next. The event page still lists every price.</small></span></label>
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
                {basis === "base_plus" && <label className="field"><span>Ticket</span>
                  <select value={row.plusKind} onChange={(e) => update(i, { plusKind: e.target.value })} aria-label={`Tier ${i + 1} ticket type`}>
                    <option value="package">1 hooman + 1 furbaby, extras added</option>
                    <option value="human_only">Hooman only: charged per hooman, no furbaby</option>
                  </select>
                </label>}
                {basis === "base_plus" && i > 0 && <label className="check small"><input type="checkbox" checked={row.withPrevious} onChange={(e) => update(i, { withPrevious: e.target.checked })} /><span>Opens together with the ticket above <span className="muted">With "Offer prices in order", e.g. Regular and Hooman only both open once Early Bird closes</span></span></label>}
                {basis === "base_plus" && row.plusKind !== "human_only" && <div className="tier-rule row-2">
                  <label className="field"><span>Each extra hooman</span><span className="peso-input"><span aria-hidden="true">₱</span><input type="text" inputMode="decimal" value={row.extraHumanFee} onChange={(e) => update(i, { extraHumanFee: e.target.value })} placeholder="0" aria-label={`Tier ${i + 1} fee per extra hooman`} /></span></label>
                  <label className="field"><span>Each extra furbaby</span><span className="peso-input"><span aria-hidden="true">₱</span><input type="text" inputMode="decimal" value={row.extraFurbabyFee} onChange={(e) => update(i, { extraFurbabyFee: e.target.value })} placeholder="0" aria-label={`Tier ${i + 1} fee per extra furbaby`} /></span></label>
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
                  {row.limited && basis === "base_plus" && row.plusKind !== "human_only" && (
                    <label className="field"><span>Count the limit by</span>
                      <select value={row.limitUnit} onChange={(e) => update(i, { limitUnit: e.target.value })} aria-label={`Tier ${i + 1} limit counts`}>
                        <option value="registrations">Registrations</option>
                        <option value="furbabies">Furbabies (dog slots)</option>
                        <option value="hoomans">Hoomans</option>
                      </select>
                    </label>
                  )}
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
/** Payment hold: a quick pick, or Custom hours + minutes (up to 7 days). Sends one paymentHoldMinutes value. */
function HoldField({ initial }) {
  const custom = initial != null && !isPresetHold(initial);
  const [choice, setChoice] = useState(custom ? "custom" : initial == null ? "" : String(initial));
  const start = holdParts(custom ? initial : 360);
  const [hours, setHours] = useState(String(start.hours));
  const [mins, setMins] = useState(String(start.minutes));
  const total = (Number(hours) || 0) * 60 + (Number(mins) || 0);
  const tooLong = total > MAX_PAYMENT_HOLD_MINUTES;
  const value = choice === "custom" ? (total >= 1 && !tooLong ? String(total) : "") : choice;
  return (
    <div className="form" style={{ gap: 8 }}>
      <label className="field"><span>Payment hold length <small>How long a "Payment pending" spot stays held before it frees up for someone else.</small></span>
        <select value={choice} onChange={(e) => setChoice(e.target.value)}>
          <option value="">Default (24 hours)</option>
          {PAYMENT_HOLD_OPTIONS.map(([minutes, label]) => <option key={minutes} value={minutes}>{label}</option>)}
          <option value="custom">Custom…</option>
        </select>
      </label>
      {choice === "custom" && <div className="row-2">
        <label className="field"><span>Hours</span><input type="number" min={0} max={168} value={hours} onChange={(e) => setHours(e.target.value)} /></label>
        <label className="field"><span>Minutes</span><input type="number" min={0} max={59} value={mins} onChange={(e) => setMins(e.target.value)} /></label>
      </div>}
      {choice === "custom" && <p className="small muted" style={{ margin: 0 }} role="status">{tooLong ? "Up to 7 days. Shorten it, or pick No limit." : total < 1 ? "Enter at least 1 minute." : `Spots are held for ${holdLabel(total)}.`}</p>}
      <input type="hidden" name="paymentHoldMinutes" value={value} />
    </div>
  );
}

export function SignupFields({ registration, capacity, capacityBasis, rsvpOpen, rsvpLabel, vaccinationRecordRequired, feeRequired, onsitePayment, paymentHoldMinutes, maxFurbabiesPerRegistration, maxHumansPerFurbaby, maxPublicHumans, date, rsvpOpensAt, rsvpFormConfig }) {
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
          <div className="form">
            <label className="field"><span>Capacity <small>Empty for no limit. When full, new sign-ups join the waitlist.</small></span><input type="number" name="capacity" min={1} max={5000} defaultValue={capacity ?? ""} /></label>
            <label className="field"><span>Capacity counts as <small>Separate from price. This decides how many venue slots one registration uses.</small></span>
              <select name="capacityBasis" defaultValue={capacityBasis || "registration"}>
                <option value="registration">One slot per registration</option>
                <option value="human">One slot per hooman</option>
                <option value="furbaby">One slot per furbaby</option>
              </select>
            </label>
            <input type="hidden" name="attendeeLimitsSent" value="1" />
            <div className="row-2">
              <label className="field"><span>Most furbabies per registration <small>Empty for no limit</small></span><input type="number" name="maxFurbabiesPerRegistration" min={1} max={20} defaultValue={maxFurbabiesPerRegistration ?? ""} /></label>
              <label className="field"><span>Most people per furbaby <small>Empty for no limit</small></span><input type="number" name="maxHumansPerFurbaby" min={1} max={20} defaultValue={maxHumansPerFurbaby ?? ""} /></label>
            </div>
            <label className="field"><span>Most hoomans from public RSVPs <small>Empty for no limit. Counts every hooman on confirmed public RSVPs (unpaid ones while their hold lasts); people you add by hand, like VIPs and organizers, don't count. Over it, new RSVPs join the waitlist.</small></span><input type="number" name="maxPublicHumans" min={1} max={10000} defaultValue={maxPublicHumans ?? ""} /></label>
            <p className="small muted" style={{ margin: 0 }}>Example: 2 and 2 means one RSVP can bring up to 2 furbabies, with up to 2 people each. Going over is refused, not charged. Per-furbaby pricing always needs at least one furbaby.</p>
            <p className="small muted" style={{ margin: 0 }}>Example: 3 hoomans in one registration use 3 hooman slots. A furbaby-capacity event needs at least one furbaby in each registration. The amount is still decided below under Pricing.</p>
          </div>
          <div className="form">
            <input type="hidden" name="rsvpOpenSent" value="1" />
            <label className="switch"><input type="checkbox" name="rsvpOpen" checked={open} onChange={(e) => setOpen(e.target.checked)} /><span><strong>Registration is open</strong><small>Switch off to close RSVP while keeping the event page visible.</small></span></label>
            {paid && <>
              <label className="check"><input type="checkbox" name="feeRequired" defaultChecked={Boolean(feeRequired)} /> They pay by QR before the day (track it per person)</label>
              {feeRequired && <label className="check"><input type="checkbox" name="onsitePayment" defaultChecked={Boolean(onsitePayment)} /> On-site payment is available <span className="small muted">The regular rate applies on site; leave this off until the venue confirms.</span></label>}
              {feeRequired && (
                <HoldField initial={paymentHoldMinutes} />
              )}
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
          <input type="hidden" name="capacityBasis" value={capacityBasis || "registration"} />
          <input type="hidden" name="paymentHoldMinutes" value={paymentHoldMinutes ?? ""} />
          <input type="hidden" name="attendeeLimitsSent" value="1" />
          <input type="hidden" name="maxFurbabiesPerRegistration" value={maxFurbabiesPerRegistration ?? ""} />
          <input type="hidden" name="maxHumansPerFurbaby" value={maxHumansPerFurbaby ?? ""} />
          <input type="hidden" name="maxPublicHumans" value={maxPublicHumans ?? ""} />
          <input type="hidden" name="rsvpOpenSent" value="1" />
          {(rsvpOpen ?? true) && <input type="hidden" name="rsvpOpen" value="on" />}
          <input type="hidden" name="rsvpLabel" value={rsvpLabel || ""} />
          {vaccinationRecordRequired && <input type="hidden" name="vaccinationRecordRequired" value="on" />}
          {/* A scheduled opening stays saved while sign-ups are off. */}
        </>
      )}
      {!(on && paid) && feeRequired && <input type="hidden" name="feeRequired" value="on" />}
      {on && !paid && feeRequired && <input type="hidden" name="paymentHoldMinutes" value={paymentHoldMinutes ?? ""} />}
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
  const [questions, setQuestions] = useState(parsed.questions || []);
  const [vaccinationRequired, setVaccinationRequired] = useState(Boolean(parsed.vaccinationRequired));
  const setQuestion = (i, patch) => setQuestions((list) => list.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const newId = () => { let n = questions.length + 1; while (questions.some((q) => q.id === `q${n}`)) n++; return `q${n}`; };
  const labels = { identity: "Name, email and furbaby name", attendees: "Hoomans and furbabies", photoConsent: "Photo consent", under18: "Age and guardian", vaccination: "Vaccination record" };
  const move = (key, direction) => setOrder((current) => { const index = current.indexOf(key); const next = index + direction; if (index < 0 || next < 0 || next >= current.length) return current; const copy = [...current]; [copy[index], copy[next]] = [copy[next], copy[index]]; return copy; });
  const toggle = (key) => setOptional((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  return <fieldset className="rsvp-form-settings indent-full"><legend>Participant form</legend><p className="small muted">Required identity and attendee details stay in the form. Choose optional questions, then arrange the blocks with the arrows.</p><div className="check-row">{["photoConsent", "under18", "vaccination"].map((key) => <label key={key} className="check"><input type="checkbox" checked={optional.includes(key)} disabled={key === "vaccination" && !vaccinationRecordRequired} onChange={() => toggle(key)} /> {labels[key]}{key === "vaccination" && !vaccinationRecordRequired ? " (turn it on above first)" : ""}</label>)}</div><ol className="rsvp-order-list">{order.filter((key) => key === "identity" || key === "attendees" || optional.includes(key)).map((key, index, list) => <li key={key}><span>{labels[key]}{key === "identity" || key === "attendees" ? " · required" : ""}</span><span><button type="button" className="linkish" disabled={index === 0} onClick={() => move(key, -1)} aria-label={`Move ${labels[key]} up`}>↑</button><button type="button" className="linkish" disabled={index === list.length - 1} onClick={() => move(key, 1)} aria-label={`Move ${labels[key]} down`}>↓</button></span></li>)}</ol>{optional.includes("vaccination") && vaccinationRecordRequired && <label className="switch"><input type="checkbox" checked={vaccinationRequired} onChange={(e) => setVaccinationRequired(e.target.checked)} /><span><strong>Require a vaccination card for each furbaby</strong><small>The RSVP can't be sent until every furbaby has a card photo. Hooman only tickets aren't asked.</small></span></label>}<div className="custom-questions"><strong>Your own questions</strong><p className="small muted" style={{ margin: 0 }}>Each one shows on this event's RSVP as a required Yes / No, e.g. "Interested in checking in at Novotel?". Answers are on each registration and in the CSV; tick "Show on RSVP table" to add a column.</p>{questions.map((q, i) => <div key={q.id} className="custom-question-row"><label className="field"><span className="visually-hidden">Question {i + 1}</span><input type="text" maxLength={200} value={q.label} placeholder="e.g. Interested in checking in at Novotel?" onChange={(e) => setQuestion(i, { label: e.target.value })} aria-label={`Question ${i + 1}`} /></label><label className="check small"><input type="checkbox" checked={q.showInTable} onChange={(e) => setQuestion(i, { showInTable: e.target.checked })} /> Show on RSVP table</label><button type="button" className="linkish" onClick={() => setQuestions((list) => list.filter((_, j) => j !== i))} aria-label={`Remove question ${i + 1}`}>Remove</button></div>)}{questions.length < 10 && <button type="button" className="btn ghost small" style={{ justifySelf: "start" }} onClick={() => setQuestions((list) => [...list, { id: newId(), label: "", showInTable: true }])}>+ Add a Yes / No question</button>}</div><label className="switch"><input type="checkbox" checked={consentEnabled} onChange={(e) => setConsentEnabled(e.target.checked)} /><span><strong>Add an event acknowledgement</strong><small>Participants complete it from their private RSVP page. No extra email is sent.</small></span></label>{consentEnabled && <><label className="field"><span>Starting template</span><select value={consentTemplate} onChange={(e) => setConsentTemplate(e.target.value)}>{Object.entries(CONSENT_TEMPLATES).map(([key, template]) => <option key={key} value={key}>{template.label}</option>)}</select></label><label className="field"><span>Acknowledgement introduction <small>Optional. Do not add legal wording unless HOR has approved it.</small></span><textarea maxLength={1000} value={consentIntro} onChange={(e) => setConsentIntro(e.target.value)} rows={3} /></label><label className="switch"><input type="checkbox" checked={consentRequiredBeforeCheckin} onChange={(e) => setConsentRequiredBeforeCheckin(e.target.checked)} /><span><strong>Require it before check-in</strong><small>The QR still works and the registration stays confirmed; the door team will ask them to complete it first.</small></span></label></>}<input type="hidden" name="rsvpFormConfig" value={JSON.stringify({ optional, order, consentEnabled, consentIntro, consentRequiredBeforeCheckin, consentTemplate, questions: questions.filter((q) => q.label.trim()), vaccinationRequired: vaccinationRequired && optional.includes("vaccination") })} /></fieldset>;
}

export function CheckinSettings({ eventId, message, preset, failurePreset, hasCustomSound }) {
  const [sound, setSound] = useState(preset || "dazzle");
  const [failureSound, setFailureSound] = useState(failurePreset || "warning");
  const [data, setData] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  function previewPreset(kind) {
    const selected = kind === "success" ? sound : failureSound;
    if (selected === "silent") return;
    if (selected === "custom" && eventId) return new Audio(`/api/checkin-sound/${eventId}`).play().catch(() => null);
    const notes = selected === "soft" ? [[523.25, 0]] : selected === "celebration" ? [[523.25, 0], [659.25, 0.12], [783.99, 0.24]] : selected === "short" ? [[261.63, 0], [196, 0.14]] : selected === "warning" ? [[220, 0], [174.61, 0.13]] : [[659.25, 0], [783.99, 0.1], [1046.5, 0.2]];
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const context = new AudioContext();
      const now = context.currentTime;
      notes.forEach(([frequency, offset]) => {
        const oscillator = context.createOscillator(); const gain = context.createGain();
        oscillator.type = selected === "warning" || selected === "short" ? "triangle" : "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.1, now + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.3);
        oscillator.connect(gain).connect(context.destination); oscillator.start(now + offset); oscillator.stop(now + offset + 0.32);
      });
      setTimeout(() => context.close(), 900);
    } catch { /* Preview is optional feedback. */ }
  }
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
      <p className="small muted" style={{ margin: 0 }}>After a successful scan, the door screen welcomes the guest by name, with their furbaby&apos;s photo or their initials, and plays the selected sound. Failed scans keep the standard warning tone.</p>
      <label className="field"><span>Message under the guest&apos;s name <small>Optional. Leave empty to show no message.</small></span><textarea name="checkinSuccessMessage" maxLength={300} rows={2} defaultValue={message ?? DEFAULT_WELCOME_MESSAGE} /></label>
      <div className="row-2 checkin-sound-row"><label className="field"><span>Success sound</span><select name="checkinSoundPreset" value={sound} onChange={(e) => setSound(e.target.value)}><option value="dazzle">Dazzle · bright three-note chime</option><option value="celebration">Celebration · warm three-note chime</option><option value="soft">Soft confirm · subtle single tone</option><option value="silent">Silent</option>{(hasCustomSound || data) && <option value="custom">Uploaded sound{name ? ` · ${name}` : ""}</option>}</select></label><button type="button" className="btn ghost small" aria-label="Preview success sound" onClick={() => previewPreset("success")}>Preview</button></div>
      <label className="btn ghost small file-btn" style={{ width: "fit-content" }}>Upload a sound<input type="file" accept="audio/mpeg,audio/wav,audio/x-wav,audio/ogg" onChange={pick} hidden /></label>
      {hasCustomSound && <label className="check"><input type="checkbox" name="checkinSoundRemove" /> Remove the uploaded sound</label>}
      <div className="row-2 checkin-sound-row"><label className="field"><span>Failed scan sound</span><select name="checkinFailureSoundPreset" value={failureSound} onChange={(e) => setFailureSound(e.target.value)}><option value="warning">Warning · low two-note tone</option><option value="short">Short warning · quick two-note tone</option><option value="silent">Silent</option></select></label><button type="button" className="btn ghost small" aria-label="Preview failed-scan sound" onClick={() => previewPreset("failure")}>Preview</button></div>
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
