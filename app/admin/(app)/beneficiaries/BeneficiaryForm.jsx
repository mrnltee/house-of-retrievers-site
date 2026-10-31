import { BENEFICIARY_KINDS, BENEFICIARY_LIMITS as L, BENEFICIARY_STATUSES } from "../../../lib/beneficiaries.mjs";
import { saveBeneficiary } from "../../beneficiaryActions";
import ConfirmButton from "../ConfirmButton";

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
          <div className="row-3">
            <label className="field"><span>Type</span><select name="kind" defaultValue={v("kind") || "shelter"}>{BENEFICIARY_KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
            <label className="field"><span>Status</span><select name="status" defaultValue={v("status") || "prospect"}>{BENEFICIARY_STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
            <label className="field"><span>Location <small>e.g. Quezon City</small></span><input type="text" name="location" maxLength={L.location} defaultValue={v("location")} /></label>
          </div>
          <label className="field"><span>Description <small>Who they are and the animals they care for</small></span><textarea name="description" rows={4} maxLength={L.description} defaultValue={v("description")} /></label>
          <label className="field"><span>What they need <small>Optional, e.g. food, medicine, vet care, volunteers</small></span><textarea name="needs" rows={3} maxLength={L.needs} defaultValue={v("needs")} /></label>
          <div className="row-2">
            <label className="field"><span>Website <small>Optional</small></span><input type="text" name="website" maxLength={L.website} defaultValue={v("website")} /></label>
            <label className="field"><span>Instagram <small>Optional</small></span><input type="text" name="instagram" maxLength={L.instagram} defaultValue={v("instagram")} /></label>
          </div>
        </section>
        <section className="card form">
          <h2>Contact and letters <span className="chip">Admins only</span></h2>
          <div className="row-3">
            <label className="field"><span>Contact person</span><input type="text" name="contactName" maxLength={L.contactName} defaultValue={v("contact_name")} /></label>
            <label className="field"><span>Email <small>Where letters go</small></span><input type="email" name="contactEmail" maxLength={L.contactEmail} defaultValue={v("contact_email")} /></label>
            <label className="field"><span>Phone</span><input type="tel" name="contactPhone" maxLength={L.contactPhone} defaultValue={v("contact_phone")} /></label>
          </div>
          <div className="row-2">
            <label className="field"><span>Address <small>For letters, one line each</small></span><textarea name="address" rows={2} maxLength={L.address} defaultValue={v("address")} /></label>
            <label className="field"><span>Greeting <small>“Dear ___,” e.g. Ms. Maria. Blank = the contact person, else the name</small></span><input type="text" name="salutation" maxLength={L.salutation} defaultValue={v("salutation")} placeholder="Ms. Maria" /></label>
          </div>
          <label className="field"><span>Notes</span><textarea name="notes" rows={3} maxLength={L.notes} defaultValue={v("notes")} /></label>
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
