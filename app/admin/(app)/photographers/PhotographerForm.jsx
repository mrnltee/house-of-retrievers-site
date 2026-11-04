import { PHOTOGRAPHER_LIMITS as L } from "../../../lib/photographers.mjs";
import SocialFields from "../SocialFields";
import { savePhotographer } from "../../photographerActions";
import ConfirmButton from "../ConfirmButton";
import ImageField from "../ImageField";

/** Add or edit a photographer: shown under "Photos by" on the past events they're credited on. */
export default function PhotographerForm({ row = null, canEdit = true }) {
  const v = (key) => row?.[key] || "";
  const ig = v("instagram").replace(/^https:\/\/www\.instagram\.com\//, "@");
  return (
    <form action={savePhotographer} className="form" style={{ gap: 16 }}>
      {row && <input type="hidden" name="id" value={row.id} />}
      <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 16 }}>
        <section className="card form">
          <h2>About</h2>
          <label className="field"><span>Name <small>As they want to be credited</small></span><input type="text" name="name" required maxLength={L.name} defaultValue={v("name")} /></label>
          <ImageField name="photo" label="Photo" hint="Their face or their logo; shown in a circle." current={v("photo")} round maxEdge={800} />
          <label className="field"><span>Short bio <small>Up to {L.bio} characters, shown when someone opens their credit</small></span><textarea name="bio" rows={3} maxLength={L.bio} defaultValue={v("bio")} /></label>
        </section>
        <section className="card form">
          <h2>Portfolio and socials</h2>
          <div className="row-2">
            <label className="field"><span>Portfolio <small>Their website or online portfolio</small></span><input type="text" name="website" placeholder="https://" maxLength={L.website} defaultValue={v("website")} /></label>
            <label className="field"><span>Instagram <small>Optional</small></span><input type="text" name="instagram" placeholder="@name" maxLength={L.instagram} defaultValue={ig} /></label>
          </div>
          <SocialFields row={row} />
        </section>
        <section className="card form">
          <h2>On the website</h2>
          <label className="check"><input type="checkbox" name="showOnSite" defaultChecked={Boolean(row?.show_on_site)} /> <span>Show on the website <span className="small muted">· under “Photos by” on the past events they&apos;re credited on. Needs a short bio.</span></span></label>
          <label className="field"><span>Notes <small>Only admins see these, e.g. rates or how to reach them</small></span><textarea name="notes" rows={3} maxLength={L.notes} defaultValue={v("notes")} /></label>
        </section>
      </fieldset>
      {canEdit && (
        <div className="actions">
          <ConfirmButton className="btn dark" title={row ? "Save changes?" : "Add this photographer?"} items={[row ? "Updates their details everywhere they're credited." : "Adds them to Photographers. Credit them on an event from that event's page."]}>{row ? "Save" : "Add photographer"}</ConfirmButton>
        </div>
      )}
    </form>
  );
}
