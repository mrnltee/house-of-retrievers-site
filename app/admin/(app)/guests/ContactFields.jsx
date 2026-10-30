import { CONTACT_CATEGORIES, CONTACT_LIMITS } from "../../../lib/contacts.mjs";

/** The fields of one Guest list contact (add form and edit page). */
export default function ContactFields({ row = {}, category = "" }) {
  return (
    <>
      <div className="row-2">
        <label className="field"><span>Category <small>Picks the letter</small></span>
          <select name="category" defaultValue={row.category || category} required>
            <option value="">Choose…</option>
            {CONTACT_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </label>
        <label className="field"><span>Name on the letter <small>e.g. Senator Juan Miguel Zubiri</small></span><input name="name" defaultValue={row.name || ""} maxLength={CONTACT_LIMITS.name} required /></label>
      </div>
      <div className="row-2">
        <label className="field"><span>Email <small>Where the letter goes</small></span><input name="email" type="email" defaultValue={row.email || ""} maxLength={CONTACT_LIMITS.email} /></label>
        <label className="field"><span>Company / office <small>Optional</small></span><input name="organization" defaultValue={row.organization || ""} maxLength={CONTACT_LIMITS.organization} /></label>
      </div>
      <div className="row-2">
        <label className="field"><span>Phone <small>Optional</small></span><input name="phone" defaultValue={row.phone || ""} maxLength={CONTACT_LIMITS.phone} /></label>
        <label className="field"><span>Instagram / handle <small>Optional</small></span><input name="handle" defaultValue={row.handle || ""} maxLength={CONTACT_LIMITS.handle} /></label>
      </div>
      <label className="field"><span>Notes <small>Optional, only admins see this</small></span><textarea name="notes" rows={2} defaultValue={row.notes || ""} maxLength={CONTACT_LIMITS.notes} /></label>
    </>
  );
}
