import { adminBase, pageAdmin } from "../../../../lib/admin/guard";
import { can } from "../../../../lib/admin/roles.mjs";
import { blanksOf } from "../../../../lib/letters.mjs";
import { blankSample } from "../../../../lib/letters/samples.mjs";
import { listLetters, savedAnswers } from "../../../../lib/letterStore";
import { saveStandardDetails } from "../../../letterActions";
import ConfirmButton from "../../ConfirmButton";
import { Flash, NotAllowed, PageHead } from "../../ui";

/**
 * Letters → Standard details: every blank the letters ask for, with HOR's usual
 * answer. Ticked answers fill in by themselves and aren't asked when sending;
 * the rest are offered as the starting answer.
 */
export default async function StandardDetailsPage({ searchParams }) {
  const params = await searchParams;
  const { admin, allowed } = await pageAdmin("letters:view");
  if (!allowed) return <NotAllowed />;
  const base = await adminBase();
  const canEdit = can(admin, "letters:edit");
  const [letters, answers] = await Promise.all([listLetters(), savedAnswers()]);
  // Each blank once, with the letters that use it, most-used first.
  const byLabel = new Map();
  for (const l of letters) {
    for (const b of blanksOf(l.subject, l.cover, l.body)) {
      const entry = byLabel.get(b.label) || { label: b.label, optional: b.optional, letters: [], sample: blankSample(b.label, l.key) };
      entry.letters.push(l.name);
      byLabel.set(b.label, entry);
    }
  }
  const rows = [...byLabel.values()].sort((a, b) => b.letters.length - a.letters.length || a.label.localeCompare(b.label));

  return (
    <>
      <p className="small"><a href={`${base}/letters`}>← Letters</a></p>
      <PageHead title="Standard details" lead="HOR's usual answers for the blanks in your letters: who to contact, who signs, bank details. Tick “Fill in by itself” and that blank is filled for every letter and not asked when sending. Unticked answers are offered as a starting point you can change." />
      <Flash params={params} />
      <form action={saveStandardDetails} className="card form">
        <div className="table-wrap">
          <table className="standard-details">
            <thead><tr><th>Blank</th><th>HOR&apos;s answer</th><th>Fill in by itself</th></tr></thead>
            <tbody>
              {rows.map((r) => {
                const value = answers.values[r.label] || "";
                const long = r.label.length > 40 || value.length > 60;
                return (
                  <tr key={r.label}>
                    <td>
                      <span className="tag-badge">[{r.label}]</span>
                      <br /><span className="small muted">Used in {r.letters.length === letters.length ? "every letter" : r.letters.length === 1 ? r.letters[0] : `${r.letters.length} letters`}</span>
                    </td>
                    <td>
                      <input type="hidden" name="label" value={r.label} />
                      {long
                        ? <textarea name="value" rows={2} maxLength={600} defaultValue={value} placeholder={r.sample || ""} disabled={!canEdit} aria-label={r.label} />
                        : <input type="text" name="value" maxLength={600} defaultValue={value} placeholder={r.sample || ""} disabled={!canEdit} aria-label={r.label} />}
                    </td>
                    <td><label className="check"><input type="checkbox" name="standard" value={r.label} defaultChecked={answers.standard.has(r.label)} disabled={!canEdit} /> <span className="small">Don&apos;t ask</span></label></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {canEdit && (
          <div className="actions">
            <ConfirmButton className="btn dark" title="Save the standard details?" items={["Ticked answers fill in by themselves in every letter", "Unticked answers are offered when sending", "An empty answer is cleared"]} yes="Yes, save">Save</ConfirmButton>
          </div>
        )}
      </form>
    </>
  );
}
