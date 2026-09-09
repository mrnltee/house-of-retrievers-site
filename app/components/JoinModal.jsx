import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { interests, joinFieldCopy } from "../content/join";
import { socialPlatforms } from "../lib/socialProfile";
import { resizeImage } from "../lib/resizeImage";

export default function JoinModal({ interest, setInterest, onClose }) {
  const dialog = useRef(null);
  const [sent, setSent] = useState(false);
  const [social, setSocial] = useState("");
  const [socialPlatform, setSocialPlatform] = useState("");
  const [profileHelpOpen, setProfileHelpOpen] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [hasFurbaby, setHasFurbaby] = useState(interest === "Member" ? "yes" : "");
  const [photoError, setPhotoError] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const fieldCopy = joinFieldCopy[interest] || joinFieldCopy.Member;

  useEffect(() => {
    const opener = document.activeElement;
    const element = dialog.current;
    element.querySelector("button").focus();
    const trapFocus = (event) => {
      if (event.key !== "Tab") return;
      const controls = [...element.querySelectorAll('button, input, textarea, select, a[href], [tabindex="0"]')]
        .filter((control) => !control.disabled && control.getClientRects().length);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !element.contains(document.activeElement))) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !element.contains(document.activeElement))) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", trapFocus);
    return () => {
      document.removeEventListener("keydown", trapFocus);
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

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
          organization: formData.get("organization"),
          profile: social,
          socialPlatform,
          furbabyName: formData.get("furbabyName"),
          photo: photo ? photo.dataUrl : "",
          photoName: photo ? photo.name : "",
          message: formData.get("message"),
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setSubmitError(result?.error || "That didn’t go through. Mind trying again?");
        return;
      }

      setSent(true);
    } catch {
      setSubmitError("We couldn’t reach the server. Check your connection and give it another go?");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialog} className="join-modal" role="dialog" aria-modal="true" aria-labelledby="join-title">
        <button className="modal-close" onClick={onClose} aria-label="Close form"><Icon name="close" /></button>
        {!sent ? (
          <>
            <div className="eyebrow">Your first step</div>
            <h2 id="join-title">How would you like<br />to join the pack?</h2>
            <p className="modal-lead">Pick whatever fits you today — you can always join the rest later.</p>
            <div className="interest-grid">
              {interests.map((item) => (
                <button type="button" key={item} aria-pressed={interest === item} className={interest === item ? "active" : ""} onClick={() => setInterest(item)}>
                  <span><Icon name={interest === item ? "check" : "paw"} size={17} /></span>{item}
                </button>
              ))}
            </div>
            <form onSubmit={submit}>
              <label>{interest === "Sponsor" ? "Contact person" : "Name"}<input required name="name" autoComplete="name" placeholder="e.g. Jane Doe" /></label>
              <label>Email<input required type="email" name="email" autoComplete="email" spellCheck={false} placeholder="e.g. jane@email.com" /></label>
              <label>{fieldCopy.organizationLabel}<input name="organization" type="text" placeholder={fieldCopy.organizationPlaceholder} /></label>
              <div className="social-field">
                <div className="profile-label-row"><label htmlFor="join-social">{fieldCopy.profileLabel}</label>{socialPlatform ? <button type="button" className="profile-help-link" onClick={() => setProfileHelpOpen(true)}>Where do I find this?</button> : null}</div>
                <div className="social-row">
                  <input
                    id="join-social"
                    name="profile"
                    type="text"
                    autoComplete="url"
                    placeholder={socialPlatform === "Facebook" ? "e.g. facebook.com/yourname" : socialPlatform === "Instagram" ? "e.g. instagram.com/yourname" : fieldCopy.profilePlaceholder}
                    value={social}
                    onChange={(event) => {
                      setSocial(event.target.value);
                      // Clearing the field clears the choice with it, so a
                      // platform can never be left selected against no handle.
                      if (!event.target.value.trim()) setSocialPlatform("");
                    }}
                  />
                  <div className="social-platforms" role="radiogroup" aria-label="Which platform is that handle on?">
                    {socialPlatforms.map((name) => (
                      <label key={name} className={socialPlatform === name ? "active" : ""}>
                        <input
                          type="radio"
                          name="socialPlatform"
                          value={name}
                          checked={socialPlatform === name}
                          disabled={!social.trim()}
                          onChange={() => setSocialPlatform(name)}
                        />
                        <span aria-hidden="true">{name === "Instagram" ? "IG" : "FB"}</span>
                        <span className="visually-hidden">{name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              {profileHelpOpen ? <div className="profile-help" role="dialog" aria-label={`Finding your ${socialPlatform} profile URL`}><div><strong>Find your {socialPlatform} profile link</strong><button type="button" onClick={() => setProfileHelpOpen(false)} aria-label="Close profile link help"><Icon name="close" size={16} /></button></div><ol><li>Open {socialPlatform} and go to your profile.</li><li>Use the <b>Share</b> or <b>···</b> menu.</li><li>Choose <b>Copy profile link</b>, then paste it here.</li></ol><p>Example: <code>{socialPlatform === "Facebook" ? "facebook.com/yourname" : "instagram.com/yourname"}</code></p></div> : null}
              <fieldset className="furbaby-question"><legend>Do you have a furbaby?</legend><p className="furbaby-hint">Tell us who you’ll be bringing along.</p><div className="furbaby-options"><label className={hasFurbaby === "yes" ? "selected" : ""}><input type="radio" name="hasFurbaby" value="yes" checked={hasFurbaby === "yes"} onChange={() => setHasFurbaby("yes")} /> <span>Yes, I do</span></label><label className={hasFurbaby === "no" ? "selected" : ""}><input type="radio" name="hasFurbaby" value="no" checked={hasFurbaby === "no"} onChange={() => { setHasFurbaby("no"); setPhoto(null); }} /> <span>Not yet</span></label></div></fieldset>
              {hasFurbaby === "yes" ? <label>{fieldCopy.furbabyLabel}<input name="furbabyName" type="text" placeholder={fieldCopy.furbabyPlaceholder} /></label> : null}
              {hasFurbaby === "yes" ? <div className="photo-field">
                <label htmlFor="join-photo">Furbaby photo (optional)</label>
                {photo ? (
                  <div className="photo-preview">
                    <img src={photo.dataUrl} alt="" />
                    <div>
                      <strong>{photo.name}</strong>
                      <small>{photo.width}&times;{photo.height} · {Math.round(photo.bytes / 1024)}&nbsp;KB</small>
                    </div>
                    <button type="button" onClick={() => { setPhoto(null); setPhotoError(""); }} aria-label="Remove photo">
                      <Icon name="close" size={16} />
                    </button>
                  </div>
                ) : (
                  <input
                    id="join-photo"
                    type="file"
                    accept="image/*"
                    disabled={photoBusy}
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (!file) return;
                      setPhotoError("");
                      setPhotoBusy(true);
                      try {
                        const resized = await resizeImage(file);
                        setPhoto({ ...resized, name: file.name });
                      } catch (error) {
                        setPhotoError(error.message);
                      } finally {
                        setPhotoBusy(false);
                      }
                    }}
                  />
                )}
                {photoBusy ? <small className="photo-hint">Getting that ready&hellip;</small> : null}
                {photoError ? <small className="photo-hint error">{photoError}</small> : null}
              </div> : null}
              <label>{interest === "Sponsor" ? "Sponsorship details" : "Message"}<textarea name="message" placeholder={interest === "Sponsor" ? "Tell us about your sponsorship goals or activity interest" : "A short hello is perfect"} rows="3" /></label>
              <button className="button dark" type="submit" disabled={submitting}>
                {submitting ? "Sending…" : <>Continue as {interest} <Icon name="arrow" /></>}
              </button>
              {submitError ? <p className="form-error" role="alert">{submitError}</p> : null}
              <small className="form-note">
                We keep your name, email, photo, and anything else you share here on a private House of Retrievers list, and we only use it to follow up about joining. Message us on <a href="https://www.instagram.com/houseofretrieversph/" target="_blank" rel="noreferrer">Instagram</a> or <a href="https://www.facebook.com/houseofretrieversph" target="_blank" rel="noreferrer">Facebook</a> any time and we’ll take you off it.
              </small>
            </form>
          </>
        ) : (
          <div className="success-state">
            <span><Icon name="check" size={34} /></span>
            <div className="eyebrow">Got it</div>
            <h2>Welcome to the pack.</h2>
            <p>Thanks for reaching out as a {interest.toLowerCase()}. We’ve got your details, and someone from the pack will be in touch soon.</p>
            <button className="button dark" onClick={onClose}>Back to the site <Icon name="arrow" /></button>
          </div>
        )}
      </section>
    </div>
  );
}
