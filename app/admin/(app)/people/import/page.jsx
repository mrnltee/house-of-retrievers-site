import { adminBase, pageAdmin } from "../../../../lib/admin/guard";
import { importPeople } from "../../../actions";
import { Flash, NotAllowed, PageHead } from "../../ui";

/** Brings everyone from the Join sheet into People, once (re-running is safe). */
export default async function ImportPeoplePage({ searchParams }) {
  const params = await searchParams;
  const { allowed } = await pageAdmin("people:edit");
  if (!allowed) return <NotAllowed />;
  const base = await adminBase();
  return (
    <>
      <p className="small"><a href={`${base}/people`}>← People</a></p>
      <PageHead title="Import from the Join sheet" lead="People who joined before the admin existed are only in the Google Sheet. This brings them in, so People is the whole list." />
      <Flash params={params} />
      <section className="card">
        <h2>1. Download the sheet</h2>
        <p className="small">Open the Join responses sheet in Google Sheets, then <strong>File → Download → Comma-separated values (.csv)</strong>. Download the tab with the applications.</p>
        <h2>2. Upload it here</h2>
        <form action={importPeople} className="form" style={{ gap: 14 }}>
          <label className="field"><span>The CSV file <small>Up to 5 MB</small></span>
            <input type="file" name="file" accept=".csv,text/csv" required />
          </label>
          <ul className="small muted import-notes">
            <li>Matched by email and join type, so running it again adds no duplicates.</li>
            <li>People already here keep what they have; the sheet only fills in blanks and the earlier join date.</li>
            <li>Statuses carry over when they match the admin's list; anything else goes into the notes.</li>
            <li>Photos stay in Drive and aren't imported. New sign-ups bring theirs in automatically.</li>
            <li>No emails are sent.</li>
          </ul>
          <div className="actions"><button className="btn gold">Import</button></div>
        </form>
      </section>
    </>
  );
}
