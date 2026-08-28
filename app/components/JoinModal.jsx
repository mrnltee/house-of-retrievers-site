import { useState } from "react";
import Icon from "./Icon";
import { interests, joinFieldCopy } from "../content/join";

export default function JoinModal({ interest, setInterest, onClose }) {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const fieldCopy = joinFieldCopy[interest];

  const submit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const formData = new FormData(event.currentTarget);
    setSubmitting(true);
    setSubmitError("");

    try {
      const response = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interest,
          name: formData.get("name"),
          email: formData.get("email"),
          profile: formData.get("profile"),
          furbabyName: formData.get("furbabyName"),
          message: formData.get("message"),
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setSubmitError(result?.error || "We could not send your request. Please try again.");
        return;
      }

      setSent(true);
    } catch {
      setSubmitError("We could not reach the server. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="join-modal" role="dialog" aria-modal="true" aria-labelledby="join-title">
        <button className="modal-close" onClick={onClose} aria-label="Close form"><Icon name="close" /></button>
        {!sent ? (
          <>
            <div className="eyebrow">Your first step</div>
            <h2 id="join-title">How would you like<br />to join the pack?</h2>
            <p className="modal-lead">Choose what fits you today. You can always explore the others later.</p>
            <div className="interest-grid">
              {interests.map((item) => (
                <button key={item} className={interest === item ? "active" : ""} onClick={() => setInterest(item)}>
                  <span><Icon name={interest === item ? "check" : "paw"} size={17} /></span>{item}
                </button>
              ))}
            </div>
            <form onSubmit={submit}>
              <label>Name<input required name="name" autoComplete="name" placeholder="e.g. Jane Doe" /></label>
              <label>Email<input required type="email" name="email" autoComplete="email" spellCheck={false} placeholder="e.g. jane@email.com" /></label>
              <label>{fieldCopy.profileLabel}<input name="profile" type="text" autoComplete="url" placeholder={fieldCopy.profilePlaceholder} /></label>
              <label>{fieldCopy.furbabyLabel}<input name="furbabyName" type="text" placeholder={fieldCopy.furbabyPlaceholder} /></label>
              <label>Tell us about your retriever or interest<textarea name="message" placeholder="A short hello is perfect" rows="3" /></label>
              <button className="button dark" type="submit" disabled={submitting}>
                {submitting ? "Sending…" : <>Continue as {interest} <Icon name="arrow" /></>}
              </button>
              {submitError ? <p className="form-error" role="alert">{submitError}</p> : null}
              <small className="form-note">
                We keep your name, email, and anything you share here in a private House of Retrievers list, and use it only to follow up about joining. Message us on <a href="https://www.instagram.com/houseofretrieversph/" target="_blank" rel="noreferrer">Instagram</a> or <a href="https://www.facebook.com/houseofretrieversph" target="_blank" rel="noreferrer">Facebook</a> any time to have your details removed.
              </small>
            </form>
          </>
        ) : (
          <div className="success-state">
            <span><Icon name="check" size={34} /></span>
            <div className="eyebrow">Request received</div>
            <h2>Welcome to the pack.</h2>
            <p>Thank you for reaching out as a {interest.toLowerCase()}. We have your details and will be in touch soon.</p>
            <button className="button dark" onClick={onClose}>Back to the site <Icon name="arrow" /></button>
          </div>
        )}
      </section>
    </div>
  );
}
