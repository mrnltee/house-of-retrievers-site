import { statusHint, statusLabel, statusTone } from "../../lib/letterSends.mjs";
import { formatWhen } from "./ui";

/**
 * A recipient's letter email status: the latest send (status, letter, when)
 * and, when there's more, the full log with times. `before` covers letters
 * sent before the log existed (no delivery status for those).
 */
export default function SendStatus({ sends = [], letterName, before = "", usual = "" }) {
  const latest = sends[0];
  if (!latest) return before ? <span className="small">Sent · {before}<br /><span className="muted">Before delivery tracking</span></span> : "—";
  const changed = latest.status !== "sent" && new Date(latest.status_at) - new Date(latest.sent_at) > 60000;
  return (
    <div className="send-status">
      <span className={`chip ${statusTone(latest.status)}`.trim()} title={[statusHint(latest.status), letterName(latest.letter_key)].filter(Boolean).join(" · ")}>{statusLabel(latest.status)}</span>
      {latest.letter_key !== usual && <span className="small">{letterName(latest.letter_key)}</span>}
      <span className="small muted">Sent {formatWhen(latest.sent_at)}{changed ? ` · ${statusLabel(latest.status).toLowerCase()} ${formatWhen(latest.status_at)}` : ""}</span>
      {latest.detail && <span className="small send-detail">{latest.detail}</span>}
      {sends.length > 1 || latest.cc?.length || latest.bcc?.length ? (
        <details className="send-log">
          <summary className="small">History ({sends.length})</summary>
          <ol>
            {sends.map((s, i) => (
              <li key={i} className="small">
                <strong>{statusLabel(s.status)}</strong> · {letterName(s.letter_key)}<br />
                <span className="muted">Sent {formatWhen(s.sent_at)} to {s.email_to}{s.cc?.length ? ` (cc ${s.cc.join(", ")})` : ""}{s.bcc?.length ? ` (bcc ${s.bcc.join(", ")})` : ""}{s.status !== "sent" ? ` · ${statusLabel(s.status).toLowerCase()} ${formatWhen(s.status_at)}` : ""}</span>
                {s.detail && <><br /><span className="send-detail">{s.detail}</span></>}
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </div>
  );
}
