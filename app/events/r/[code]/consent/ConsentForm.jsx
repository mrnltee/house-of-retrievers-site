"use client";
import { useState } from "react";

export default function ConsentForm({ code, name, furbabyName, under18, guardianName, completedAt, consentName }) {
  const [done, setDone] = useState(Boolean(completedAt));
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault(); setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch(`/api/rsvp/consent/${code}`, { method: "POST", body: data });
    const result = await response.json();
    if (!response.ok) return setError(result.error || "We couldn't save that. Please try again.");
    setDone(true);
  }
  if (done) return <div className="success-state" role="status"><h2>Thank you.</h2><p>Your event acknowledgement is recorded{consentName ? ` under ${consentName}` : ""}.</p><a className="button dark" href={`/r/${code}`}>Back to my RSVP page</a></div>;
  return <form className="form consent-form" onSubmit={submit}><p><strong>Registered name</strong><br />{name}</p>{furbabyName && <p><strong>Furbaby</strong><br />{furbabyName}</p>}<label className="check"><input type="checkbox" name="agree" required /> <span>I have read and agree to follow the event safety and participation guidelines.</span></label><label className="field"><span>Type your registered name</span><input name="consentName" required defaultValue={name} autoComplete="name" /></label>{under18 && <label className="field"><span>Guardian&apos;s name</span><input name="guardianName" required defaultValue={guardianName || ""} /></label>}{error && <p className="form-error" role="alert">{error}</p>}<button className="button dark" type="submit">Confirm acknowledgement</button></form>;
}
