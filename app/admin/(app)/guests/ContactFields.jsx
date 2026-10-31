import { CONTACT_CATEGORIES, CONTACT_LIMITS } from "../../../lib/contacts.mjs";
import ImageField from "../ImageField";

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
        <label className="field"><span>Name <small>The person (e.g. Jessie Mae Gabriel), or the brand if there's no contact yet</small></span><input name="name" defaultValue={row.name || ""} maxLength={CONTACT_LIMITS.name} required /></label>
      </div>
      <div className="row-2">
        <label className="field"><span>Email <small>Where the letter goes</small></span><input name="email" type="email" defaultValue={row.email || ""} maxLength={CONTACT_LIMITS.email} /></label>
        <label className="field"><span>Company / brand / office <small>Optional. When filled, the letter is to this company, attention of the name</small></span><input name="organization" defaultValue={row.organization || ""} maxLength={CONTACT_LIMITS.organization} /></label>
      </div>
      <div className="row-2">
        <label className="field"><span>Phone <small>Optional</small></span><input name="phone" defaultValue={row.phone || ""} maxLength={CONTACT_LIMITS.phone} /></label>
        <label className="field"><span>Instagram / handle <small>Optional</small></span><input name="handle" defaultValue={row.handle || ""} maxLength={CONTACT_LIMITS.handle} /></label>
      </div>
      <div className="row-2">
        <label className="field"><span>Address <small>Optional, one line each, e.g. street, then city</small></span><textarea name="address" rows={2} defaultValue={row.address || ""} maxLength={CONTACT_LIMITS.address} /></label>
        <label className="field"><span>Greeting <small>Optional: “Dear ___,” e.g. Ms. Jessie. Blank = the name</small></span><input name="salutation" defaultValue={row.salutation || ""} maxLength={CONTACT_LIMITS.salutation} placeholder="Ms. Jessie" /></label>
      </div>
      <div className="row-2">
        <ImageField name="photo" label="Photo" hint="A face or profile picture. Shown as their avatar." current={row.photo || ""} round maxEdge={600} />
        <ImageField name="logo" label="Logo" hint="Their brand or office logo, if any." current={row.logo || ""} />
      </div>
      <label className="field"><span>Notes <small>Optional, only admins see this</small></span><textarea name="notes" rows={2} defaultValue={row.notes || ""} maxLength={CONTACT_LIMITS.notes} /></label>
    </>
  );
}
