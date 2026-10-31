import { BENEFICIARY_KINDS, BENEFICIARY_LIMITS as L, BENEFICIARY_STATUSES } from "../../../lib/beneficiaries.mjs";
import { saveBeneficiary } from "../../beneficiaryActions";
import ConfirmButton from "../ConfirmButton";
import ImageField from "../ImageField";

/** Add or edit a beneficiary: who they are, what they need, and who letters go to. */
export default function BeneficiaryForm({ row = null, canEdit = true }) {
  const v = (key) => row?.[key] || "";
  return (
    <form action={saveBeneficiary} className="form" style={{ gap: 16 }}>
      {row && <input type="hidden" name="id" value={row.id} />}
      <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 16 }}>
        <section className="card form">
          <h2>About</h2>
          <label className="field"><span>Name <small>The shelter or group</small></span><input type="text" name="name" required maxLength={L.name} defaultValue={v("name")} /></label>
          <div className="row-2">
            <label className="field"><span>Type</span><select name="kind" defaultValue={v("kind") || "shelter"}>{BENEFICIARY_KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
            <label className="field"><span>Status</span><select name="status" defaultValue={v("status") || "prospect"}>{BENEFICIARY_STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          </div>
          <div className="row-2">
            <ImageField name="logo" label="Logo" hint="Their logo. Shown as the avatar when there's no photo." current={v("logo")} />
            <ImageField name="photo" label="Photo" hint="The shelter, its team or its animals." current={v("photo")} round maxEdge={1000} />
          </div>
          <label className="field"><span>Description <small>Who they are and the animals they care for</small></span><textarea name="description" rows={4} maxLength={L.description} defaultValue={v("description")} /></label>
          <label className="field"><span>What they need <small>Optional, e.g. food, medicine, vet care, volunteers</small></span><textarea name="needs" rows={3} maxLength={L.needs} defaultValue={v("needs")} /></label>
          <div className="row-2">
            <label className="field"><span>Website <small>Optional</small></span><input type="text" name="website" placeholder="https://" maxLength={L.website} defaultValue={v("website")} /></label>
            <label className="field"><span>Instagram <small>Optional</small></span><input type="text" name="instagram" placeholder="@name" maxLength={L.instagram} defaultValue={v("instagram")} /></label>
          </div>
        </section>
        <section className="card form">
          <h2>Address</h2>
          <p className="small muted" style={{ margin: 0 }}>Printed on letters as: street, then barangay and city, then province and postal code. Leave out what you don&apos;t have.</p>
          <label className="field"><span>Street, building, unit</span><textarea name="street" rows={2} maxLength={L.street} defaultValue={v("street") || (!v("city") ? v("address") : "")} placeholder="123 Katipunan Ave., Unit 4" /></label>
          <div className="row-2">
            <label className="field"><span>Barangay</span><input type="text" name="barangay" maxLength={L.barangay} defaultValue={v("barangay")} placeholder="Brgy. San Roque" /></label>
            <label className="field"><span>City / municipality</span><input type="text" name="city" maxLength={L.city} defaultValue={v("city")} placeholder="Quezon City" /></label>
          </div>
          <div className="row-2">
            <label className="field"><span>Province / region</span><input type="text" name="province" maxLength={L.province} defaultValue={v("province")} placeholder="Metro Manila" /></label>
            <label className="field"><span>Postal code</span><input type="text" name="postalCode" inputMode="numeric" maxLength={L.postalCode} defaultValue={v("postal_code")} placeholder="1109" /></label>
          </div>
        </section>
        <section className="card form">
          <h2>Contact and letters <span className="chip">Admins only</span></h2>
          <div className="row-3">
            <label className="field"><span>Contact person</span><input type="text" name="contactName" maxLength={L.contactName} defaultValue={v("contact_name")} /></label>
            <label className="field"><span>Email <small>Where letters go</small></span><input type="email" name="contactEmail" maxLength={L.contactEmail} defaultValue={v("contact_email")} /></label>
            <label className="field"><span>Contact number</span><input type="tel" name="contactPhone" maxLength={L.contactPhone} defaultValue={v("contact_phone")} placeholder="0917 123 4567" /></label>
          </div>
          <label className="field"><span>Greeting <small>How letters greet them: “Dear ___,” e.g. Ms. Maria. Blank = the contact person, else the name</small></span><input type="text" name="salutation" maxLength={L.salutation} defaultValue={v("salutation")} placeholder="Ms. Maria" /></label>
          <label className="field"><span>Notes <small>Only admins see these</small></span><textarea name="notes" rows={3} maxLength={L.notes} defaultValue={v("notes")} /></label>
        </section>
      </fieldset>
      {canEdit && (
        <div className="actions">
          <ConfirmButton className="btn dark" title={row ? "Save changes?" : "Add this beneficiary?"} items={[row ? "Updates this beneficiary's details." : "Adds them to Beneficiaries, ready for a letter."]}>{row ? "Save" : "Add beneficiary"}</ConfirmButton>
        </div>
      )}
    </form>
  );
}
