"use client";

/** Which part of the ledger to show: all of it, one event, or lines not tied to an event. Changes at once. */
export default function ScopeSelect({ events, value, kind, action }) {
  return (
    <form method="get" action={action} className="ledger-scope">
      {kind && <input type="hidden" name="kind" value={kind} />}
      <label className="tracker-sort">
        <span className="sr-only">Show</span>
        <select name="event" defaultValue={value} onChange={(e) => e.target.form.requestSubmit()}>
          <option value="">All events and general lines</option>
          <option value="general">Not tied to an event</option>
          {events.map((e) => <option key={e.id} value={e.id}>{e.title}{e.date ? ` · ${e.date}` : ""}{e.status === "draft" ? " (draft)" : ""}</option>)}
        </select>
      </label>
      <noscript><button type="submit" className="btn small ghost" data-confirm="not-needed-read-only">Show</button></noscript>
    </form>
  );
}
