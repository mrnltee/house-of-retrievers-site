import { sql } from "../../../lib/db";
import { adminBase, pageAdmin } from "../../../lib/admin/guard";
import { can } from "../../../lib/admin/roles.mjs";
import { CONTACT_CATEGORIES, categoryOf, letterEmails, letterFor } from "../../../lib/contacts.mjs";
import { groupLetters, listLetters } from "../../../lib/letterStore";
import { recipientFields } from "../../../lib/letters.mjs";

// What "Dear [Salutation]" will say for this record.
const greetingOf = (f) => f.salutation || f.contact || f.name;
import { saveContact } from "../../contactActions";
import { Flash, NotAllowed, PageHead, formatDay } from "../ui";
import ContactFields from "./ContactFields";
import ConfirmButton from "../ConfirmButton";
import { Avatar } from "../ImageField";
import TickedSubmit from "../TickedSubmit";

/**
 * Guest list: celebrities, influencers, politicians, VIPs, media, speakers,
 * sponsors and partners, grouped by the letter each category gets. Sponsors
 * and partners already in Sponsors & partners show in their groups too.
 */
export default async function GuestsPage({ searchParams }) {
  const params = await searchParams;
  const { admin, allowed } = await pageAdmin("guests:view");
  if (!allowed) return <NotAllowed />;
  const base = await adminBase();
  // Sending still needs letters:edit; sponsor rows only for those who may see Sponsors & partners.
  const canEdit = can(admin, "guests:edit") && can(admin, "letters:edit");
  const seeSupporters = can(admin, "supporters:view");
  const only = categoryOf(params?.category)?.key || "";
  const q = String(params?.q || "").trim().slice(0, 80);
  const [contacts, supporters, letters, chosen] = await Promise.all([
    sql(
      `SELECT * FROM letter_contacts WHERE deleted_at IS NULL AND ($1 = '' OR category = $1)
          AND ($2 = '' OR name ILIKE '%' || $2 || '%' OR coalesce(organization,'') ILIKE '%' || $2 || '%' OR coalesce(email,'') ILIKE '%' || $2 || '%')
        ORDER BY name`,
      [only, q],
    ),
    !seeSupporters ? [] : sql(
      `SELECT id, name, kind, status, contact_email, contact_name, address, salutation, logo FROM supporters WHERE status <> 'ended'
          AND ($1 = '' OR name ILIKE '%' || $1 || '%') ORDER BY name`,
      [q],
    ),
    listLetters(),
    groupLetters(),
  ]);
  const letterName = (key) => letters.find((l) => l.key === key)?.name || key;
  const groups = CONTACT_CATEGORIES.filter((c) => !only || c.key === only).map((c) => ({
    ...c,
    letter: letterFor(c.key, chosen),
    rows: [
      ...contacts.filter((r) => r.category === c.key).map((r) => ({ ref: `contact:${r.id}`, id: r.id, photo: r.photo, logo: r.logo, name: r.name, sub: r.organization, email: letterEmails(r).to, rep: r.rep_name ? `Rep: ${r.rep_name}${r.send_to !== "person" ? " (gets letters)" : ""}` : "", greeting: greetingOf(recipientFields({ contact: r })), href: `${base}/guests/${r.id}`, last: r.last_sent_at ? `${letterName(r.last_letter)} · ${formatDay(r.last_sent_at)}` : "" })),
      ...supporters.filter((s) => (c.key === "sponsor" && s.kind === "Sponsor") || (c.key === "partner" && s.kind === "Partner"))
        .map((s) => ({ ref: `supporter:${s.id}`, id: s.id, logo: s.logo, name: s.name, sub: s.contact_name ? `${s.contact_name} · from Sponsors & partners` : "From Sponsors & partners", email: s.contact_email, greeting: greetingOf(recipientFields({ supporter: s })), href: `${base}/supporters/${s.id}`, last: "" })),
    ],
  }));

  return (
    <>
      <PageHead title="Guest list" lead="Everyone HOR sends letters to, grouped by category. Each category gets its own letter; tick people in a group and send it. You check the letter before anything goes out." />
      <Flash params={params} />
      <form method="get" action={`${base}/guests`} className="card actions" role="search" style={{ flexWrap: "wrap", gap: 10 }}>
        <select name="category" defaultValue={only} aria-label="Category">
          <option value="">All categories</option>
          {CONTACT_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <input name="q" defaultValue={q} placeholder="Search name, company, email" aria-label="Search" />
        <button className="btn ghost" type="submit" data-confirm="not-needed-read-only">Filter</button>
        {(only || q) && <a className="small" href={`${base}/guests`}>Clear</a>}
      </form>

      {canEdit && (
        <details className="card" id="add" open={params?.add === "1"}>
          <summary className="strong">+ Add someone</summary>
          <form action={saveContact} className="form" style={{ marginTop: 12 }}>
            <ContactFields category={only} />
            <div className="actions"><ConfirmButton className="btn dark" title="Add to the guest list?" items={["They show in their category, ready for that category's letter."]}>Add to the guest list</ConfirmButton></div>
          </form>
        </details>
      )}

      {groups.map((g) => (
        <section key={g.key} className="card" style={{ marginTop: 16 }}>
          <form method="get" action={`${base}/letters/send`}>
            <input type="hidden" name="letter" value={g.letter} />
            <div className="actions" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: 0 }}>{g.label} <span className="muted small">({g.rows.length})</span></h2>
                <p className="small muted" style={{ margin: "4px 0 0" }}>Letter: <a href={`${base}/letters/${g.letter}`}>{letterName(g.letter)}</a></p>
              </div>
              {canEdit && g.rows.length > 0 && <TickedSubmit>✉ Send this letter to ticked</TickedSubmit>}
            </div>
            {/* The table shows even when empty, with an add link that picks this category. */}
            <div className="table-wrap" style={{ marginTop: 10 }}>
              <table>
                <thead><tr>{canEdit && <th><span className="sr-only">Pick</span></th>}<th>Name</th><th>Email</th><th>Greeting</th><th>Last letter</th></tr></thead>
                <tbody>
                  {g.rows.map((r) => (
                    <tr key={r.ref}>
                      {canEdit && <td><input type="checkbox" name="to" value={r.ref} aria-label={`Pick ${r.name}`} /></td>}
                      <td className="strong"><span className="row-name"><Avatar photo={r.photo} logo={r.logo} name={r.name} /><span><a href={r.href}>{r.name}</a>{r.sub && <><br /><span className="small muted">{r.sub}</span></>}</span></span></td>
                      <td>{r.email || <span className="muted">No email yet</span>}{r.rep && <><br /><span className="small muted">{r.rep}</span></>}</td>
                      <td className="small">Dear {r.greeting},</td>
                      <td className="small">{r.last || "—"}</td>
                    </tr>
                  ))}
                  {g.rows.length === 0 && <tr><td colSpan={canEdit ? 5 : 4} className="muted">No one here yet.</td></tr>}
                </tbody>
              </table>
            </div>
            {canEdit && <p className="small" style={{ margin: "8px 0 0" }}><a href={`${base}/guests?category=${g.key}&add=1#add`}>+ Add to {g.label}</a></p>}
          </form>
        </section>
      ))}
    </>
  );
}
