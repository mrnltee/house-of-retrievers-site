import { statusHint, statusLabel, statusTone } from "../../lib/letterSends.mjs";
import { formatWhen } from "./ui";
import SendHistory from "./SendHistory";

const copies = (s) => `${s.cc?.length ? ` (cc ${s.cc.join(", ")})` : ""}${s.bcc?.length ? ` (bcc ${s.bcc.join(", ")})` : ""}`;

/**
 * A recipient's letter email status: the latest send (status, letter, when)
 * and, when there's more than one, "History (N)" opening the full log in a
 * dialog (SendHistory). A single send shows its CC / BCC inline. `before` covers letters
 * sent before the log existed (no delivery status for those).
 */
export default function SendStatus({ sends = [], letterName, before = "", usual = "", name = "" }) {
  const latest = sends[0];
  if (!latest) return before ? <span className="small">Sent · {before}<br /><span className="muted">Before delivery tracking</span></span> : "—";
  const changed = latest.status !== "sent" && new Date(latest.status_at) - new Date(latest.sent_at) > 60000;
  return (
    <div className="send-status">
      <span className={`chip ${statusTone(latest.status)}`.trim()} title={[statusHint(latest.status), letterName(latest.letter_key)].filter(Boolean).join(" · ")}>{statusLabel(latest.status)}</span>
      {latest.letter_key !== usual && <span className="small">{letterName(latest.letter_key)}</span>}
      <span className="small muted">Sent {formatWhen(latest.sent_at)}{changed ? ` · ${statusLabel(latest.status).toLowerCase()} ${formatWhen(latest.status_at)}` : ""}</span>
      {latest.detail && <span className="small send-detail">{latest.detail}</span>}
      {sends.length === 1 && (latest.cc?.length || latest.bcc?.length) ? <span className="small muted">{copies(latest).trim()}</span> : null}
      {sends.length > 1 && (
        <SendHistory
          name={name}
          entries={sends.map((s) => ({
            status: statusLabel(s.status),
            letter: letterName(s.letter_key),
            line: `Sent ${formatWhen(s.sent_at)} to ${s.email_to}${copies(s)}${s.status !== "sent" ? ` · ${statusLabel(s.status).toLowerCase()} ${formatWhen(s.status_at)}` : ""}`,
            detail: s.detail || "",
          }))}
        />
      )}
    </div>
  );
}
