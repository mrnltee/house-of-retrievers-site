import { CONTACT_CATEGORIES, CONTACT_LIMITS, SEND_TO } from "../../../lib/contacts.mjs";
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
      <label className="field"><span>Company / brand / office <small>Optional. When filled, the letter is addressed to this company, attention of the name above</small></span><input name="organization" defaultValue={row.organization || ""} maxLength={CONTACT_LIMITS.organization} /></label>
      <div className="row-3">
        <label className="field"><span>Email <small>Where letters go</small></span><input name="email" type="email" defaultValue={row.email || ""} maxLength={CONTACT_LIMITS.email} /></label>
        <label className="field"><span>Contact number <small>Optional</small></span><input name="phone" type="tel" defaultValue={row.phone || ""} maxLength={CONTACT_LIMITS.phone} placeholder="0917 123 4567" /></label>
        <label className="field"><span>Instagram <small>Optional</small></span><input name="handle" placeholder="@name" defaultValue={row.handle || ""} maxLength={CONTACT_LIMITS.handle} /></label>
      </div>
      <fieldset className="field contact-rep">
        <legend className="field-head">Representative <small>Optional: a manager, agent, assistant or staff member who handles their invitations</small></legend>
        <div className="row-3">
          <label className="field"><span>Name</span><input name="repName" defaultValue={row.rep_name || ""} maxLength={CONTACT_LIMITS.name} /></label>
          <label className="field"><span>Email</span><input name="repEmail" type="email" defaultValue={row.rep_email || ""} maxLength={CONTACT_LIMITS.email} /></label>
          <label className="field"><span>Contact number</span><input name="repPhone" type="tel" defaultValue={row.rep_phone || ""} maxLength={CONTACT_LIMITS.phone} placeholder="0917 123 4567" /></label>
        </div>
      </fieldset>
      <label className="field"><span>Send letters to <small>If that email is missing, the other one is used</small></span>
        <select name="sendTo" defaultValue={row.send_to || "person"}>{SEND_TO.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      </label>
      <div className="row-2">
        <label className="field"><span>Address <small>For letters, one line each: street, then city</small></span><textarea name="address" rows={2} defaultValue={row.address || ""} maxLength={CONTACT_LIMITS.address} /></label>
        <label className="field"><span>Greeting <small>How letters greet them: “Dear ___,” e.g. Ms. Jessie. Blank = the name</small></span><input name="salutation" defaultValue={row.salutation || ""} maxLength={CONTACT_LIMITS.salutation} placeholder="Ms. Jessie" /></label>
      </div>
      <div className="row-2">
        <ImageField name="photo" label="Photo" hint="A face or profile picture. Shown as their avatar." current={row.photo || ""} round maxEdge={600} />
        <ImageField name="logo" label="Logo" hint="Their brand or office logo, if any." current={row.logo || ""} />
      </div>
      <label className="field"><span>Notes <small>Only admins see these</small></span><textarea name="notes" rows={2} defaultValue={row.notes || ""} maxLength={CONTACT_LIMITS.notes} /></label>
    </>
  );
}
