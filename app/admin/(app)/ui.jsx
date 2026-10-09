/** Small server-rendered pieces shared by the admin pages. */

export function PageHead({ title, lead, children }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {lead && <p className="lead">{lead}</p>}
      </div>
      {children && <div className="actions">{children}</div>}
    </header>
  );
}

/** Shows ?ok= and ?error= messages set by server actions. */
export function Flash({ params }) {
  const ok = typeof params?.ok === "string" ? params.ok : null;
  const error = typeof params?.error === "string" ? params.error : null;
  if (!ok && !error) return null;
  return (
    <p role={error ? "alert" : "status"} className={`banner ${error ? "alert" : "ok"}`}>
      {error || ok}
    </p>
  );
}

export function NotAllowed() {
  return (
    <>
      <PageHead title="Not part of your role" lead="Ask an Owner if you need access to this page." />
    </>
  );
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function isoDate(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

export function DateBox({ date }) {
  const [, m, d] = isoDate(date).split("-").map(Number);
  return (
    <div className="datebox" aria-hidden="true">
      <small>{MONTHS[m - 1]}</small>
      <span>{d}</span>
    </div>
  );
}

/** "2026-10-17" → "Sat 17 Oct 2026" without timezone drift. */
export function formatDay(value) {
  const [y, m, d] = isoDate(value).split("-").map(Number);
  return new Intl.DateTimeFormat("en-PH", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function formatWhen(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(value));
}

export function manilaToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
}
