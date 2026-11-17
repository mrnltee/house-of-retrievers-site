import { adminBase, pageAdmin } from "../../../../lib/admin/guard";
import { can } from "../../../../lib/admin/roles.mjs";
import { blanksOf } from "../../../../lib/letters.mjs";
import { blankSample } from "../../../../lib/letters/samples.mjs";
import { listLetters, savedAnswers } from "../../../../lib/letterStore";
import { saveStandardDetails } from "../../../letterActions";
import ConfirmButton from "../../ConfirmButton";
import { Flash, NotAllowed, PageHead } from "../../ui";
import HowTo from "../../HowTo";
import { LETTER_GUIDES } from "../../../../lib/admin/howToGuides.mjs";
import Icon from "../../../../components/Icon";
import ListSearch from "../../ListSearch";

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
  // Grouped (design review, 17 Nov 2026): the handful every letter needs first, then the event, the bank details
  // from Payment settings, blanks several letters share, and last each letter's own blanks, folded.
  const ORG = ["Contact Person", "Contact Mobile", "Contact Email", "Signatory Name", "Signatory Position"];
  const EVENT = ["Event Name", "Event Short Name", "Event Date", "Event Time", "Event Location", "Event Venue", "Reply Date"];
  const take = (pick) => rows.filter((r) => pick(r));
  const org = ORG.map((l) => rows.find((r) => r.label === l)).filter(Boolean);
  const event = EVENT.map((l) => rows.find((r) => r.label === l)).filter(Boolean);
  const bank = take((r) => answers.fromPayments.has(r.label) || /^HOR (Bank|Account|GCash)/.test(r.label));
  const placed = new Set([...org, ...event, ...bank].map((r) => r.label));
  const shared = take((r) => !placed.has(r.label) && r.letters.length > 1);
  const byLetter = new Map();
  for (const r of take((r) => !placed.has(r.label) && r.letters.length === 1)) byLetter.set(r.letters[0], [...(byLetter.get(r.letters[0]) || []), r]);
  const filledIn = (list) => list.filter((r) => (answers.values[r.label] || "").trim()).length;

  const row = (r) => {
    const value = answers.values[r.label] || "";
    const long = r.label.length > 40 || value.length > 60 || (r.sample || "").length > 60;
    return (
      <tr key={r.label} data-find={`${r.label} ${value} ${r.letters.join(" ")}`.toLowerCase()}>
        <td className="sd-blank">
          <span className="tag-badge">[{r.label}]</span>
          <span className="small muted sd-used">{r.letters.length === letters.length ? "Every letter" : r.letters.length === 1 ? r.letters[0] : `${r.letters.length} letters`}</span>
        </td>
        {answers.fromPayments.has(r.label) ? (
          <td colSpan={2}><strong>{value || "—"}</strong><br /><span className="small muted">Always filled in, from <a href={`${base}/payments`}>Payment settings</a>. Change it there.</span></td>
        ) : (
          <>
            <td className="sd-answer">
              <input type="hidden" name="label" value={r.label} />
              {long
                ? <textarea name="value" rows={2} maxLength={600} defaultValue={value} placeholder={r.sample || ""} disabled={!canEdit} aria-label={`Answer for ${r.label}`} />
                : <input type="text" name="value" maxLength={600} defaultValue={value} placeholder={r.sample || ""} disabled={!canEdit} aria-label={`Answer for ${r.label}`} />}
            </td>
            <td className="sd-auto"><label className="check"><input type="checkbox" name="standard" value={r.label} defaultChecked={answers.standard.has(r.label)} disabled={!canEdit} /> <span className="small">Fill in by itself</span></label></td>
          </>
        )}
      </tr>
    );
  };
  const table = (list) => (
    <div className="table-wrap">
      <table className="standard-details stack-table">
        <thead><tr><th>Blank</th><th>HoR&apos;s answer</th><th><span className="sr-only">Fill in by itself</span></th></tr></thead>
        <tbody>{list.map(row)}</tbody>
      </table>
    </div>
  );
  const section = (key, title, note, list, folded = false) => list.length ? (folded ? (
    <details key={key} className="card sd-group sd-fold" data-find-group="">
      <summary><strong>{title}</strong> <span className="small muted">· {list.length} blank{list.length === 1 ? "" : "s"}{filledIn(list) ? `, ${filledIn(list)} answered` : ""}</span></summary>
      {note && <p className="small muted">{note}</p>}
      {table(list)}
    </details>
  ) : (
    <section key={key} className="card sd-group" data-find-group="" aria-labelledby={`sd-${key}`}>
      <h2 id={`sd-${key}`}>{title}</h2>
      {note && <p className="small muted">{note}</p>}
      {table(list)}
    </section>
  )) : null;

  return (
    <>
      <p className="small"><a href={`${base}/letters`}><Icon name="arrowLeft" /> Letters</a></p>
      <PageHead title="Standard details" lead="HoR's usual answers for the blanks in your letters. Tick “Fill in by itself” and the answer goes into every letter without being asked when you send; leave it unticked and it's offered as a starting answer you can change.">
        <HowTo guide="standard-details" guides={LETTER_GUIDES} className="btn ghost" />
      </PageHead>
      <Flash params={params} />
      <ListSearch q="" action={`${base}/letters/details`} placeholder="Find a blank by name, answer or letter…" />
      <form action={saveStandardDetails} className="form sd-form">
        {section("org", "About HoR", "Who guests contact and who signs. Most invitations ask for these.", org)}
        {section("event", "About the event", "Letters sent from an event's Guest or Brand tracker fill the event's name, date and place from the event itself; these answers are for letters sent from anywhere else.", event)}
        {section("bank", "Bank and GCash", "Filled in from Payment settings while Bank transfer or GCash is switched on there.", bank)}
        {section("shared", "Used in several letters", "", shared)}
        {[...byLetter.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([name, list], i) => section(`letter-${i}`, name, "Only this letter asks for these.", list, true))}
        {canEdit && (
          <div className="actions sd-save">
            <ConfirmButton className="btn dark" title="Save the standard details?" items={["Answers ticked “Fill in by itself” go into every letter without being asked", "The others are offered as a starting answer when sending", "An empty answer is cleared"]} yes="Yes, save">Save</ConfirmButton>
            <span className="small muted">Saves every group on this page.</span>
          </div>
        )}
      </form>
    </>
  );
}
