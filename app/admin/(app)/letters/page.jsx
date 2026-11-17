import { adminBase, pageAdmin } from "../../../lib/admin/guard";
import { can } from "../../../lib/admin/roles.mjs";
import { LETTER_GROUPS, letterFor } from "../../../lib/contacts.mjs";
import { blanksOf } from "../../../lib/letters.mjs";
import { groupLetters, listLetters, savedAnswers } from "../../../lib/letterStore";
import { createLetter, deleteLetter, saveGroupLetters } from "../../letterActions";
import WordImport from "./WordImport";
import ConfirmButton from "../ConfirmButton";
import { Flash, NotAllowed, PageHead, formatWhen } from "../ui";
import HowTo from "../HowTo";
import { LETTER_GUIDES } from "../../../lib/admin/howToGuides.mjs";
import EditDialog from "../EditDialog";
import ListSearch from "../ListSearch";

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
  // Letters made for an event live on that event's Letters page.
  const [letters, chosen, answers] = await Promise.all([listLetters().then((all) => all.filter((l) => !l.eventId)), groupLetters(), savedAnswers()]);
  const usedBy = (key) => LETTER_GROUPS.filter((g) => letterFor(g.key, chosen) === key).map((g) => g.label);
  // Grouped by what they're for (design review, 17 Nov 2026), so a list of a dozen letters reads at a glance.
  const groupOf = (l) => (!l.starter ? "own" : /^follow-up/i.test(l.name) ? "followup" : /^invitation/i.test(l.name) || l.invitation?.on ? "invite" : "ask");
  const SECTIONS = [
    ["invite", "Invitations", "For guests, speakers, media and creators."],
    ["ask", "Proposals, sponsorship and donations", "For brands, partners, donors and beneficiaries."],
    ["followup", "Follow-ups", "Short emails for people who haven't replied yet."],
    ["own", "Your own letters", "Letters HoR made or copied."],
  ];
  const findOf = (l) => [l.name, l.subject, ...usedBy(l.key)].join(" ").toLowerCase();

  return (
    <>
      <PageHead title="Letters" lead="Write a letter once, with blanks that fill in for each person. Letters are sent from the lists: an event's Guest tracker or Brand tracker, Beneficiaries, and People.">
        <HowTo guide="new-letter" guides={LETTER_GUIDES} className="btn ghost" />
        {canEdit && <a className="btn ghost" href={`${base}/letters/details`}>Standard details ({answers.standard.size})</a>}
        {canEdit && (
          <EditDialog label="+ New letter" buttonClass="btn gold" title="New letter" lead="It starts with the usual address block, greeting and signature, or with the text of a Word file. To start from an existing letter, use its Duplicate button.">
            <form action={createLetter} className="form">
              <label className="field"><span>Name <small>Only admins see this, e.g. Thank-you letter (sponsors)</small></span><input type="text" name="name" maxLength={80} required /></label>
              <WordImport />
              <div className="actions"><ConfirmButton className="btn dark" title="Make a new letter?" items={["It opens in the editor, ready to write", "Nothing is sent"]} yes="Yes, make it">Make the letter</ConfirmButton></div>
            </form>
          </EditDialog>
        )}
      </PageHead>
      <Flash params={params} />

      <details className="card letter-how">
        <summary><strong>How letters work</strong> <span className="small muted">· blanks, standard details and sending</span></summary>
        <ol className="small">
          <li><strong>Write the letter once</strong> with [blanks] where details change, e.g. <span className="tag-badge">[Company Name]</span>.</li>
          <li><strong>Blanks fill in three ways:</strong> from each recipient&apos;s record (name, contact person, address, greeting), from your <a href={`${base}/letters/details`}>standard details</a> (contact person, signatory, bank details…), or you type them when sending.</li>
          <li><strong>Tick people</strong> on an event&apos;s Guest tracker or Brand tracker, Beneficiaries or a person&apos;s profile, and press Review &amp; send. You see each person&apos;s email (and PDF, when the letter has one) before anything goes out.</li>
        </ol>
      </details>

      <ListSearch q="" action={`${base}/letters`} placeholder="Find a letter by name, subject or group…" />

      {SECTIONS.map(([key, title, note]) => {
        const list = letters.filter((l) => groupOf(l) === key);
        if (!list.length) return null;
        return (
          <section key={key} className="letter-group" data-find-group="" aria-labelledby={`letters-${key}`}>
            <div className="letter-group-head"><h2 id={`letters-${key}`}>{title} <span className="muted letter-count">· {list.length}</span></h2><p className="small muted">{note}</p></div>
            <ul className="card-list">
              {list.map((l) => {
                const asks = blanksOf(l.subject, l.cover, l.body).filter((b) => !answers.standard.has(b.label)).length;
                const groups = usedBy(l.key);
                return (
                  <li key={l.key} className="card letter-card" data-find={findOf(l)}>
                    <div>
                      <h3 style={{ margin: "0 0 4px" }}><a href={`${base}/letters/${l.key}`}>{l.name}</a></h3>
                      <p className="small muted" style={{ margin: 0 }}>Subject: {l.subject}</p>
                      <p className="letter-meta">
                        {l.invitation?.on ? <span className="chip">Invitation card</span> : !l.attachPdf ? <span className="chip">Email only</span> : <span className="chip">PDF letter</span>}
                        {groups.length ? <span className="small">Usual letter for {groups.join(", ")}</span> : null}
                        <span className="small muted">{asks ? `${asks} blank${asks === 1 ? "" : "s"} to type when sending` : "Nothing to type when sending"}</span>
                        {l.updatedAt && <span className="small muted">Edited {formatWhen(l.updatedAt)}</span>}
                      </p>
                    </div>
                    <div className="actions">
                      <a className="btn ghost small" href={`${base}/letters/${l.key}`}>{canEdit ? "Edit" : "View"}</a>
                      {canEdit && (
                        <form action={createLetter}>
                          <input type="hidden" name="from" value={l.key} />
                          <ConfirmButton className="btn ghost small" title={`Make a copy of “${l.name}”?`} items={["A new letter of your own starts with this wording", "The original stays as it is"]} yes="Yes, copy it">Duplicate</ConfirmButton>
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
          </section>
        );
      })}

      <details className="card letter-groups-fold">
        <summary><strong>Which letter each group gets</strong> <span className="small muted">· the letter a send starts with, per Guest list group and for Beneficiaries</span></summary>
        <form action={saveGroupLetters} className="form" style={{ marginTop: 12 }}>
          <p className="small muted" style={{ margin: 0 }}>You can still choose another letter in the send window.</p>
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
      </details>
    </>
  );
}
