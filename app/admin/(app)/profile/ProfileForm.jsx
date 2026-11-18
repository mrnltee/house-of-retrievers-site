"use client";

import { useState } from "react";
import { PROFILE_LIMITS, SHOW_AS, displayName, firstNameOf, initialsOf } from "../../../lib/admin/profile.mjs";
import ConfirmButton from "../ConfirmButton";
import ImageField from "../ImageField";

/**
 * My profile's form (design review, 18 Nov 2026): the photo beside the names, and a live preview of how the team
 * sees you (the sidebar's name card) that follows what you type, pick or upload before you save.
 */
export default function ProfileForm({ action, admin, role, disabled = false }) {
  const [name, setName] = useState(admin.name || "");
  const [first, setFirst] = useState(admin.first_name || firstNameOf(admin.name));
  const [furbaby, setFurbaby] = useState(admin.furbaby_name || "");
  const [showAs, setShowAs] = useState(admin.show_as || "full");
  const [photo, setPhoto] = useState(admin.photo || "");
  const me = { name, first_name: first, furbaby_name: furbaby, show_as: showAs, email: admin.email };
  const changed = name !== (admin.name || "") || first !== (admin.first_name || firstNameOf(admin.name)) || furbaby !== (admin.furbaby_name || "") || showAs !== (admin.show_as || "full") || photo !== (admin.photo || "");

  return (
    <form action={action} className="card profile-form">
      <fieldset disabled={disabled} className="profile-grid">
        <div className="profile-photo">
          <ImageField name="photo" label="Photo" hint="Optional. Without one, your initials show." current={admin.photo || ""} round maxEdge={600} onChange={(url) => setPhoto(url || "")} />
        </div>
        <div className="profile-fields">
          <div className="row-3">
            <label className="field"><span>Full name</span><input type="text" name="name" required maxLength={PROFILE_LIMITS.name} value={name} onChange={(e) => setName(e.target.value)} placeholder="Shey Santos" /></label>
            <label className="field"><span>First name <small>What people call you</small></span><input type="text" name="firstName" maxLength={PROFILE_LIMITS.firstName} value={first} onChange={(e) => setFirst(e.target.value)} placeholder="Shey" /></label>
            <label className="field"><span>Furbaby&apos;s name <small>Optional</small></span><input type="text" name="furbabyName" maxLength={PROFILE_LIMITS.furbabyName} value={furbaby} onChange={(e) => setFurbaby(e.target.value)} placeholder="Macchiato" /></label>
          </div>
          <fieldset className="profile-showas">
            <legend>Show my name as</legend>
            {SHOW_AS.map(([key, label]) => (
              <label key={key} className={`profile-choice${showAs === key ? " is-on" : ""}`}>
                <input type="radio" name="showAs" value={key} checked={showAs === key} onChange={() => setShowAs(key)} />
                <span><strong>{label}</strong><small>{displayName({ ...me, show_as: key })}</small></span>
              </label>
            ))}
          </fieldset>
        </div>
        <div className="profile-preview" aria-live="polite">
          <small>How the team sees you</small>
          <span className="profile-chip">
            <span className="me-avatar" aria-hidden="true">{photo ? <img src={photo} alt="" /> : initialsOf(me)}</span>
            <span className="profile-chip-text"><strong>{displayName(me)}</strong><span>{role}</span></span>
          </span>
          <small className="muted">In the menu, the activity log and the dashboard.</small>
        </div>
      </fieldset>
      <div className="actions profile-save">
        <ConfirmButton className="btn gold" disabled={disabled || !changed} title="Save your profile?" items={[`Your name shows as “${displayName(me)}”`, "Your name and photo update in the menu and the activity log"]} yes="Yes, save">Save profile</ConfirmButton>
        <small className="muted">{changed ? "You have unsaved changes." : "Change something to save it."}</small>
      </div>
    </form>
  );
}
