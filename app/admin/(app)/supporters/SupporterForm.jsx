import { saveSupporter } from "../../supporterActions";
import { BLURB_MAX, CATEGORY_LABEL_MAX, GIVES, STATUSES, TIERS, isPublic, supporterNumber } from "../../../lib/supporters.mjs";
import LogoField from "./LogoField";
import SupporterIdentityFields from "./SupporterIdentityFields";
import ConfirmButton from "../ConfirmButton";

/** Sponsor or partner record (Figma S2). `row` is a DB row or null; `person` prefills a new one. */
export default function SupporterForm({ row, person = null, canEdit = true }) {
  const v = (key, fallback = "") => row?.[key] ?? fallback;
  const year = new Date().getFullYear();
  const kind = row?.kind || person?.kind || "Sponsor";
  return (
    <form action={saveSupporter} className="form">
      {row && <input type="hidden" name="id" value={row.id} />}
      {person && <input type="hidden" name="personId" value={person.id} />}
      <fieldset disabled={!canEdit} className="plain form" style={{ gap: 20 }}>
        <section className="card form">
          <h2>On the website</h2>
          <LogoField current={row?.logo || ""} />
          <SupporterIdentityFields
            initialName={v("name", person?.organization || person?.name || "")}
            initialCode={v("code")}
            numbered={Boolean(row?.number_no)}
          />
          <div className="row-2">
            <label className="field"><span>Type</span>
              <select name="kind" defaultValue={kind}><option>Sponsor</option><option>Partner</option></select>
            </label>
            <label className="field"><span>Relationship label <small>Optional; a short role such as Venue partner</small></span>
              <input type="text" name="categoryLabel" maxLength={CATEGORY_LABEL_MAX} defaultValue={v("category_label")} placeholder="e.g. Venue partner" />
            </label>
          </div>
          <div className="row-2">
            <label className="field"><span>Website <small>Optional</small></span><input type="text" name="website" inputMode="url" maxLength={300} defaultValue={v("website")} placeholder="https://" /></label>
            <label className="field"><span>Instagram <small>Optional</small></span><input type="text" name="instagram" maxLength={80} defaultValue={row?.instagram ? `@${row.instagram}` : ""} placeholder="@name" /></label>
          </div>
          <label className="field"><span>Short blurb <small>Up to {BLURB_MAX} characters, shown under the logo when someone opens it</small></span>
            <textarea name="blurb" rows={3} maxLength={BLURB_MAX} defaultValue={v("blurb")} placeholder="e.g. A local pet supply store that has kept our care visits stocked since 2025." />
          </label>
          <div className="row-2">
            <label className="field"><span>Status</span>
              <select name="status" defaultValue={v("status", "inquiry")}>{STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            </label>
            <label className="field"><span>Tier <small>Sponsors only</small></span>
              <select name="tier" defaultValue={v("tier")}><option value="">No tier</option>{TIERS.map(([k, l]) => <option key={k} value={k}>★ {l}</option>)}</select>
            </label>
          </div>
          <div className="field"><span>Number</span>
            <p style={{ margin: "10px 0 0" }}>{supporterNumber(row) ? <strong>{supporterNumber(row)}</strong> : <span className="small muted">Given the first time the record is saved as Confirmed: the year they registered, then the next number for that year. The four-letter code can't change after that.</span>}</p>
          </div>
          <label className="check">
            <input type="checkbox" name="showOnSite" defaultChecked={row ? row.show_on_site : false} />
            <span><strong>Show on the website</strong> <span className="small muted">Needs Confirmed status, a logo and a blurb. Switches off by itself when the status becomes Ended.{row && (isPublic(row) ? " Showing now." : " Not showing now.")}</span></span>
          </label>
        </section>

        <section className="card form">
          <h2>What they gave</h2>
          <fieldset className="plain">
            <legend className="field-head">Kind of support</legend>
            <div className="actions">
              {GIVES.map(([k, l]) => (
                <label key={k} className="check pill-check"><input type="checkbox" name="gives" value={k} defaultChecked={(row?.gives || []).includes(k)} /> {l}</label>
              ))}
            </div>
          </fieldset>
          <div className="row-3">
            <label className="field"><span>Year</span>
              <select name="supportYear" defaultValue={v("support_year", year)}>{[year + 1, year, year - 1, year - 2].map((y) => <option key={y}>{y}</option>)}</select>
            </label>
            <label className="field"><span>Cash (₱)</span><input type="text" name="cashAmount" inputMode="decimal" defaultValue={v("cash_amount")} placeholder="15000" /></label>
            <label className="field"><span>In-kind value (₱)</span><input type="text" name="inKindValue" inputMode="decimal" defaultValue={v("in_kind_value")} placeholder="6000" /></label>
          </div>
          <label className="field"><span>In-kind, in words <small>Optional, e.g. treats and grooming kits</small></span><input type="text" name="inKindNote" maxLength={160} defaultValue={v("in_kind_note")} /></label>
          <label className="check">
            <input type="checkbox" name="amountsAgreed" defaultChecked={Boolean(row?.amounts_agreed_at)} />
            <span><strong>The sponsor knows these amounts are public</strong> <span className="small muted">Amounts appear on the website (HOR's transparency promise) only once this is ticked.{row?.amounts_agreed_at && ` Confirmed ${String(row.amounts_agreed_at).slice(0, 10)} by ${row.amounts_agreed_by}.`}</span></span>
          </label>
        </section>

        <section className="card form">
          <h2>Contact <span className="chip">Admins only</span></h2>
          <div className="row-3">
            <label className="field"><span>Person</span><input type="text" name="contactName" maxLength={120} defaultValue={v("contact_name", person?.name || "")} /></label>
            <label className="field"><span>Email</span><input type="email" name="contactEmail" maxLength={160} defaultValue={v("contact_email", person?.email || "")} /></label>
            <label className="field"><span>Phone</span><input type="tel" name="contactPhone" maxLength={40} defaultValue={v("contact_phone")} /></label>
          </div>
          <div className="row-2">
            <label className="field"><span>Address <small>For letters, one line each</small></span><textarea name="address" rows={2} maxLength={300} defaultValue={v("address")} /></label>
            <label className="field"><span>Greeting <small>For letters: “Dear ___,” e.g. Ms. Jessie. Blank = the person, else the company</small></span><input type="text" name="salutation" maxLength={120} defaultValue={v("salutation")} placeholder="Ms. Jessie" /></label>
          </div>
          <label className="field"><span>Notes</span><textarea name="notes" rows={3} maxLength={2000} defaultValue={v("notes")} /></label>
        </section>
      </fieldset>
      {canEdit && (
        <div className="actions form-actions-sticky">
          <ConfirmButton
            title={row ? `Save changes to ${row.name}?` : "Create this supporter record?"}
            echo={[{ name: "name", label: "Name" }, { name: "code", label: "ID code" }, { name: "kind", label: "Type" }, { name: "categoryLabel", label: "Relationship label" }, { name: "status", label: "Status" }]}
            items={[row ? "The supporter record is updated" : "A new supporter record is added", "Public details change only when the record is complete, Confirmed and switched on"]}
            yes={row ? "Yes, save changes" : "Yes, create record"}
          >{row ? "Save" : "Create record"}</ConfirmButton>
        </div>
      )}
    </form>
  );
}
