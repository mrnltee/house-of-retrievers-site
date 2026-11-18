import { sql } from "../../../lib/db";
import HowTo from "../HowTo";
import { PAGE_GUIDES } from "../../../lib/admin/howToGuides.mjs";
import { adminBase, pageAdmin } from "../../../lib/admin/guard";
import { can } from "../../../lib/admin/roles.mjs";
import { BENEFICIARY_KINDS, BENEFICIARY_STATUSES, beneficiaryWebsiteGaps, kindLabel, statusLabel } from "../../../lib/beneficiaries.mjs";
import { groupLetters, listLetters } from "../../../lib/letterStore";
import { letterFor } from "../../../lib/contacts.mjs";
import { recipientFields } from "../../../lib/letters.mjs";
import { Flash, NotAllowed, PageHead, formatDay } from "../ui";
import { Avatar } from "../ImageField";
import ListSearch from "../ListSearch";
import SelectionBar from "../events/[id]/brands/SelectionBar";
import SelectAll from "../events/[id]/brands/SelectAll";
import SendStatus from "../SendStatus";
import { refreshSends, sendsFor } from "../../../lib/letterSendsStore";

const cleanParam = (value, max = 80) => String(value || "").trim().slice(0, max);

/** Beneficiaries: shelters and rescue groups, with filters, and letters like Brands & Partners. */
export default async function BeneficiariesPage({ searchParams }) {
  const params = await searchParams;
  const { admin, allowed } = await pageAdmin("beneficiaries:view");
  if (!allowed) return <NotAllowed />;
  const base = await adminBase();
  const canEdit = can(admin, "beneficiaries:edit");
  const canSend = can(admin, "letters:edit");
  const kind = BENEFICIARY_KINDS.some(([k]) => k === params?.kind) ? params.kind : "";
  const status = BENEFICIARY_STATUSES.some(([k]) => k === params?.status) ? params.status : "";
  const q = cleanParam(params?.q);
  const [rows, letters, statusCounts] = await Promise.all([
    sql(
      `SELECT * FROM beneficiaries WHERE deleted_at IS NULL AND ($1 = '' OR kind = $1) AND ($2 = '' OR status = $2)
          AND ($3 = '' OR name ILIKE '%' || $3 || '%' OR coalesce(location,'') ILIKE '%' || $3 || '%' OR coalesce(contact_name,'') ILIKE '%' || $3 || '%')
        ORDER BY array_position(ARRAY['partnered','talking','prospect','ended','helped'], status), name`,
      [kind, status, q],
    ),
    listLetters(),
    sql("SELECT status, count(*)::int AS n FROM beneficiaries WHERE deleted_at IS NULL GROUP BY status"),
  ]);
  const countOf = (key) => statusCounts.find((c) => c.status === key)?.n || 0;
  const total = statusCounts.reduce((sum, c) => sum + c.n, 0);
  const tabHref = (next) => `${base}/beneficiaries${new URLSearchParams(Object.entries({ status: next, kind, q }).filter(([, v]) => v)).toString() ? `?${new URLSearchParams(Object.entries({ status: next, kind, q }).filter(([, v]) => v))}` : ""}`;
  const findOf = (r) => [r.name, r.location, kindLabel(r.kind), statusLabel(r.status), r.contact_name, r.contact_email].filter(Boolean).join(" ").toLowerCase();
  const siteLine = (r) => {
    const gaps = beneficiaryWebsiteGaps(r);
    return gaps.length ? <span className="small muted">Not on the website · needs {gaps.length < 2 ? gaps[0] : `${gaps.slice(0, -1).join(", ")} and ${gaps[gaps.length - 1]}`}</span> : <span className="small site-on"><span aria-hidden="true">●</span> On the website</span>;
  };
  const letterKey = letterFor("beneficiary", await groupLetters());
  const letterName = (key) => letters.find((l) => l.key === key)?.name || key;
  // Letter email status: check Resend for recent sends, then read each one's log.
  const refs = rows.map((r) => `beneficiary:${r.id}`);
  await refreshSends(refs);
  const sends = await sendsFor(refs);
  const filtered = Boolean(kind || status || q);

  return (
    <>
      <PageHead title="Beneficiaries" lead="The groups HoR's events support: animal shelters and rescues, and people-care homes the dogs visit. Tick groups to send a letter; you see each one before it goes."><HowTo guide={PAGE_GUIDES.beneficiaries[0]} guides={PAGE_GUIDES.beneficiaries} className="btn ghost" />
        {canEdit && <a className="btn gold" href={`${base}/beneficiaries/new`}>+ Add beneficiary</a>}
      </PageHead>
      <Flash params={params} />

      {/* Design review (17 Nov 2026): status tabs, search as you type and a type filter in one row, like the trackers. */}
      <nav className="tabs" aria-label="Status">
        <a href={tabHref("")} aria-current={!status ? "page" : undefined}>All · {total}</a>
        {BENEFICIARY_STATUSES.filter(([k]) => countOf(k) > 0 || status === k).map(([k, l]) => (
          <a key={k} href={tabHref(k)} aria-current={status === k ? "page" : undefined}>{l} · {countOf(k)}</a>
        ))}
      </nav>
      <ListSearch q={q} action={`${base}/beneficiaries`} hidden={{ status }} placeholder="Find a group by name, place, type or contact…"
        select={{ name: "kind", label: "Type", all: "All types", value: kind, options: BENEFICIARY_KINDS }}
        newHref={canEdit ? `${base}/beneficiaries/new` : ""} addNoun="new beneficiary" />

      <section className="card tracker-list">
        <form id="tracker-send" method="get" action={`${base}/letters/send`}>
          <input type="hidden" name="letter" value={letterKey} />
        </form>
        {canSend && rows.length > 0 && (
          <SelectionBar hint="Tick groups to send them a letter." letterHref={`${base}/letters/${letterKey}`} letterName={letterName(letterKey)} ownLetterHref={`${base}/letters`} ownLetterLabel="choose which letter beneficiaries get" />
        )}
        <div className="table-wrap">
          <table className="stack-table">
            <thead><tr>{canSend && <th className="st-pick">{rows.length > 0 ? <SelectAll label="Pick every group showing" /> : <span className="sr-only">Pick</span>}</th>}<th>Group</th><th>Status</th><th>Contact</th><th>Letters</th></tr></thead>
            <tbody id="tracker-rows">
              {rows.map((r) => (
                <tr key={r.id} data-row="" data-find={findOf(r)}>
                  {canSend && <td className="st-pick"><input type="checkbox" form="tracker-send" name="to" value={`beneficiary:${r.id}`} aria-label={`Pick ${r.name}`} /></td>}
                  <td className="strong st-1"><span className="row-name"><Avatar photo={r.photo} logo={r.logo} name={r.name} /><span><a href={`${base}/beneficiaries/${r.id}`}>{r.name}</a><br /><span className="small muted">{[kindLabel(r.kind) || "Type not set", r.location].filter(Boolean).join(" · ")}</span></span></span></td>
                  <td className="st-2" data-label="Status"><span className={`chip${r.status === "partnered" ? " good" : ""}`}>{statusLabel(r.status)}</span><br />{siteLine(r)}</td>
                  <td className="st-3 small" data-label="Contact">{r.contact_name || r.contact_email ? <>{r.contact_name || <span className="muted">No name yet</span>}<br /><span className="muted">{r.contact_email || "No email yet"}</span></> : <span className="muted">No contact yet</span>}<br /><span className="muted">Dear {recipientFields({ beneficiary: r }).salutation || r.contact_name || r.name},</span></td>
                  <td className="st-4 small" data-label="Letters">{(sends[`beneficiary:${r.id}`] || []).length || r.last_sent_at
                    ? <SendStatus sends={sends[`beneficiary:${r.id}`]} letterName={letterName} name={r.name} before={r.last_sent_at ? `${letterName(r.last_letter)} · ${formatDay(r.last_sent_at)}` : ""} />
                    : <span className="muted">Nothing sent yet</span>}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={canSend ? 5 : 4} className="muted">{filtered ? "No beneficiaries match these filters." : "No beneficiaries yet."} {canEdit && !filtered && <a href={`${base}/beneficiaries/new`}>+ Add the first one</a>}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
