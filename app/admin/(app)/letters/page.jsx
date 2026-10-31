import { adminBase, pageAdmin } from "../../../lib/admin/guard";
import { can } from "../../../lib/admin/roles.mjs";
import { LETTER_GROUPS, letterFor } from "../../../lib/contacts.mjs";
import { blanksOf } from "../../../lib/letters.mjs";
import { groupLetters, listLetters, savedAnswers } from "../../../lib/letterStore";
import { createLetter, deleteLetter, saveGroupLetters } from "../../letterActions";
import ConfirmButton from "../ConfirmButton";
import { Flash, NotAllowed, PageHead, formatWhen } from "../ui";

/**
 * Settings → Letters: HOR's letters (built-in and HOR's own), sent as a PDF with
 * a covering email; which letter each group gets; and a link to the standard details.
 */
export default async function LettersPage({ searchParams }) {
  const params = await searchParams;
  const { admin, allowed } = await pageAdmin("letters:view");
  if (!allowed) return <NotAllowed />;
  const base = await adminBase();
  const canEdit = can(admin, "letters:edit");
  const [letters, chosen, answers] = await Promise.all([listLetters(), groupLetters(), savedAnswers()]);
  const usedBy = (key) => LETTER_GROUPS.filter((g) => letterFor(g.key, chosen) === key).map((g) => g.label);

  return (
    <>
      <PageHead title="Letters" lead="Each letter is a PDF sent with a short covering email, addressed to each recipient by name. Send them from the Guest list, Beneficiaries or Sponsors & partners by ticking people.">
        {canEdit && <a className="btn ghost" href={`${base}/letters/details`}>Standard details ({answers.standard.size})</a>}
      </PageHead>
      <Flash params={params} />

      <div className="card letter-how">
        <h2 style={{ marginTop: 0 }}>How letters work</h2>
        <ol className="small">
          <li><strong>Write the letter once</strong> with [blanks] where details change, e.g. <span className="tag-badge">[Company Name]</span>.</li>
          <li><strong>Blanks fill in three ways:</strong> from each recipient&apos;s record (name, contact person, address, greeting), from your <a href={`${base}/letters/details`}>standard details</a> (contact person, signatory, bank details…), or you type them when sending.</li>
          <li><strong>Tick people</strong> in the Guest list, Beneficiaries or Sponsors & partners and press Send. You see each person&apos;s email and PDF before anything goes out.</li>
        </ol>
      </div>

      <h2>Your letters</h2>
      <ul className="card-list">
        {letters.map((l) => {
          const asks = blanksOf(l.subject, l.cover, l.body).filter((b) => !answers.standard.has(b.label)).length;
          const groups = usedBy(l.key);
          return (
            <li key={l.key} className="card letter-card">
              <div>
                <h3 style={{ margin: "0 0 4px" }}><a href={`${base}/letters/${l.key}`}>{l.name}</a> {!l.starter && <span className="chip">Your own</span>}</h3>
                <p className="small muted" style={{ margin: 0 }}>Subject: {l.subject}</p>
                <p className="small muted" style={{ margin: "4px 0 0" }}>
                  {groups.length ? `Sent to: ${groups.join(", ")}` : "Not set for any group"} · {asks ? `${asks} blank${asks === 1 ? "" : "s"} to fill when sending` : "Nothing to type when sending"}
                  {l.updatedAt ? ` · saved ${formatWhen(l.updatedAt)}` : " · original wording"}
                </p>
              </div>
              <div className="actions">
                <a className="btn ghost" href={`${base}/letters/${l.key}`}>{canEdit ? "Edit" : "View"}</a>
                {canEdit && (
                  <form action={createLetter}>
                    <input type="hidden" name="from" value={l.key} />
                    <ConfirmButton className="btn ghost" title={`Make a copy of “${l.name}”?`} items={["A new letter of your own starts with this wording", "The original stays as it is"]} yes="Yes, copy it">Duplicate</ConfirmButton>
                  </form>
                )}
                {canEdit && !l.starter && (
                  <form action={deleteLetter}>
                    <input type="hidden" name="key" value={l.key} />
                    <ConfirmButton className="linkish danger-text" tone="danger" title={`Remove “${l.name}”?`} items={["It leaves the list and can't be sent any more", "Letters already sent stay sent"]} yes="Yes, remove">Remove</ConfirmButton>
                  </form>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {canEdit && (
        <form action={createLetter} className="card form" style={{ marginTop: 16 }}>
          <h2 style={{ margin: 0 }}>New letter</h2>
          <p className="small muted" style={{ margin: 0 }}>Starts with the usual address block, greeting and signature. To start from an existing letter, use its Duplicate button instead.</p>
          <div className="actions" style={{ alignItems: "flex-end", flexWrap: "wrap" }}>
            <label className="field" style={{ flex: "1 1 260px" }}><span>Name <small>Only admins see this, e.g. Thank-you letter (sponsors)</small></span><input type="text" name="name" maxLength={80} required /></label>
            <ConfirmButton className="btn dark" title="Make a new letter?" items={["It opens in the editor, ready to write", "Nothing is sent"]} yes="Yes, make it">+ New letter</ConfirmButton>
          </div>
        </form>
      )}

      <form action={saveGroupLetters} className="card form" style={{ marginTop: 16 }}>
        <h2 style={{ margin: 0 }}>Which letter each group gets</h2>
        <p className="small muted" style={{ margin: 0 }}>The letter picked when you send to a group from the Guest list or Beneficiaries. You can still choose another letter on the send page.</p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Group</th><th>Letter</th></tr></thead>
            <tbody>
              {LETTER_GROUPS.map((g) => (
                <tr key={g.key}>
                  <td>{g.label}</td>
                  <td>
                    <select name={`group-${g.key}`} defaultValue={letterFor(g.key, chosen)} disabled={!canEdit} aria-label={`Letter for ${g.label}`}>
                      {letters.map((l) => <option key={l.key} value={l.key}>{l.name}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {canEdit && <div className="actions"><ConfirmButton className="btn dark" title="Save which letter each group gets?" items={["Sending to a group starts with its letter from now on"]} yes="Yes, save">Save</ConfirmButton></div>}
      </form>
    </>
  );
}
