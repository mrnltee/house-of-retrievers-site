/**
 * Letter delivery status (owner, 2026-11-01). Each letter email is logged with
 * Resend's id; its status comes from Resend's last event for that email.
 * Pure functions, so they can be tested.
 */
export const SEND_STATUSES = {
  sent: { label: "Sent", tone: "", hint: "Accepted by the mail service, waiting for the inbox to confirm" },
  delayed: { label: "Delayed", tone: "warn", hint: "Their mail server is slow to accept it; Resend keeps trying" },
  delivered: { label: "Delivered", tone: "good", hint: "Their inbox accepted it" },
  opened: { label: "Opened", tone: "good", hint: "They opened it" },
  clicked: { label: "Clicked", tone: "good", hint: "They clicked a link in it" },
  bounced: { label: "Bounced", tone: "alert", hint: "The address doesn't exist or refused it; check the email" },
  complained: { label: "Marked as spam", tone: "alert", hint: "They marked it as spam" },
  failed: { label: "Failed", tone: "alert", hint: "It didn't go out; try sending again" },
};

/** Resend's last_event → our status ("" when unknown). */
export function statusFromEvent(event) {
  const e = String(event || "").toLowerCase().replace(/^email\./, "");
  if (["queued", "scheduled", "sent"].includes(e)) return "sent";
  if (e === "delivery_delayed") return "delayed";
  if (e === "canceled" || e === "failed") return "failed";
  return SEND_STATUSES[e] ? e : "";
}

/** No later news is expected for these, so they aren't checked again. */
export const settled = (status) => ["bounced", "complained", "failed", "clicked"].includes(status);

export const statusLabel = (status) => SEND_STATUSES[status]?.label || "Sent";
export const statusTone = (status) => SEND_STATUSES[status]?.tone || "";
export const statusHint = (status) => SEND_STATUSES[status]?.hint || "";
