import { adminBase, pageAdmin } from "../../../lib/admin/guard";
import { can } from "../../../lib/admin/roles.mjs";
import { categoryLabel, LEDGER_KINDS, LEDGER_METHODS, labelOf, ledgerTotals, needsProof } from "../../../lib/ledger.mjs";
import { loadLedger } from "../../../lib/ledgerStore";
import { manilaDate } from "../../../lib/journeyEntries.mjs";
import { formatPeso } from "../../../lib/prices.mjs";
import { PAGE_GUIDES } from "../../../lib/admin/howToGuides.mjs";
import { Flash, NotAllowed, PageHead, formatDay } from "../ui";
import EditDialog from "../EditDialog";
import HowTo from "../HowTo";
import ListSearch from "../ListSearch";
import FileViewer from "../events/[id]/donors/FileViewer";
import LedgerEntryForm from "./LedgerEntryForm";
import ScopeSelect from "./ScopeSelect";

const isUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ""));
const TABS = [
  ["", "All"],
  ["income", "Cash in"],
  ["expense", "Expenses"],
  ["turnover", "Turnovers"],
  ["in_kind", "In-kind"],
  ["pledge", "Pledges"],
];
const SOURCE = { fees: "From Registrations", donation: "From Donors", brand: "From the Brand tracker" };
const KIND_LABEL = { ...Object.fromEntries(LEDGER_KINDS), income: "Cash in", pledge: "Pledge" };
const CATEGORY = { fees: "Registration fees", donation: "Cash donation", brand_cash: "Partner & sponsor cash", brand_kind: "In-kind from a brand" };

/**
 * The ledger (owner, 22 Nov 2026): every peso in and out, per event or for everything. Fees, donations and
 * brand cash / in-kind come from their own pages; Treasurers and Owners add expenses (with receipts), other
 * income, in-kind items and turnovers to beneficiaries (with proof). The transparency report adds it up.
 */
export default async function LedgerPage({ searchParams }) {
  const query = await searchParams;
  const { admin, allowed } = await pageAdmin("ledger:view");
  if (!allowed) return <NotAllowed />;
  const base = await adminBase();
  const canEdit = can(admin, "ledger:edit");
  const scope = isUuid(query.event) ? query.event : query.event === "general" ? "general" : "";
  const kindTab = TABS.some(([k]) => k && k === query.kind) ? query.kind : "";
  const { lines, entries, files, events, beneficiaries } = await loadLedger(scope || "all");
  const totals = ledgerTotals(lines);
  const peso = (n) => formatPeso(Number(n) || 0);
  const eventTitle = Object.fromEntries(events.map((e) => [e.id, e.title]));
  const scopeEvent = isUuid(scope) ? events.find((e) => e.id === scope) : null;
  const today = manilaDate();
  const entryById = Object.fromEntries(entries.map((e) => [e.id, e]));
  const filesOf = (id) => files.filter((f) => f.entry_id === id);
  const shown = kindTab ? lines.filter((l) => l.kind === kindTab) : lines;
  const count = (k) => (k ? lines.filter((l) => l.kind === k).length : lines.length);
  const back = scope;
  const qs = (params) => {
    const p = new URLSearchParams(Object.entries({ event: scope, ...params }).filter(([, v]) => v));
    return p.toString() ? `?${p}` : "";
  };
  const formProps = { events, beneficiaries, base, back, today, eventId: isUuid(scope) ? scope : "" };
  const sourceHref = (l) => (l.source === "fees" ? `${base}/registrations/${l.eventId}` : l.source === "donation" ? `${base}/events/${l.eventId}/donors` : l.source === "brand" ? `${base}/events/${l.eventId}/brands` : "");

  return (
    <>
      <PageHead
        title="Ledger"
        lead={`Every peso in and out${scopeEvent ? ` for ${scopeEvent.title}` : scope === "general" ? " not tied to an event" : ", for all events"}. Registration fees, donations and brand cash come in by themselves; add expenses with their receipts, other income, in-kind items and what you turn over to beneficiaries.`}
      >
        {canEdit && (
          <>
            <EditDialog label="+ Add an expense" buttonClass="btn gold" title="Add an expense" lead="Every expense needs its receipt: a photo or PDF of the official receipt, invoice or payment screenshot.">
              <LedgerEntryForm kinds={["expense"]} {...formProps} />
            </EditDialog>
            <EditDialog label="+ In-kind or income" buttonClass="btn ghost" title="Add in-kind items or other income" lead="In-kind items are listed with their value but never counted as cash. Other income is cash HoR received outside RSVPs and the Donors page, like a donation box.">
              <LedgerEntryForm kinds={["in_kind", "income"]} {...formProps} />
            </EditDialog>
            <EditDialog label="+ Turnover" buttonClass="btn ghost" title="Record a turnover to a beneficiary" lead="Cash or goods handed to a beneficiary, with the proof of handover (their acknowledgement receipt or a photo).">
              <LedgerEntryForm kinds={["turnover"]} {...formProps} />
            </EditDialog>
          </>
        )}
        <a className="btn dark" href={`${base}/ledger/report${qs({})}`}>Transparency report</a>
        <HowTo guide={PAGE_GUIDES.ledger[0]} guides={PAGE_GUIDES.ledger} className="btn ghost" />
      </PageHead>
      <Flash params={query} />

      <section className="card ledger-summary" aria-labelledby="ledger-totals">
        <div className="ledger-summary-head">
          <h2 id="ledger-totals">{scopeEvent ? scopeEvent.title : scope === "general" ? "Not tied to an event" : "All events"}</h2>
          <ScopeSelect events={events} value={scope} kind={kindTab} action={`${base}/ledger`} />
        </div>
        <div className="donation-proceeds-grid ledger-totals">
          <div className="donation-total"><span className="small muted">Cash in</span><strong>{peso(totals.cashIn)}</strong><span className="small">Fees, donations, brand cash and other income</span></div>
          <div className="donation-total"><span className="small muted">Spent</span><strong>{peso(totals.spent)}</strong><span className="small">Expenses, each with its receipt</span></div>
          <div className="donation-total"><span className="small muted">Turned over to beneficiaries</span><strong>{peso(totals.turnedOver)}</strong><span className="small">In cash{totals.goodsTurnedOver ? ` · plus ${peso(totals.goodsTurnedOver)} in goods` : ""}</span></div>
          <div className={`donation-total ${totals.held < 0 ? "alert" : "good"}`}><span className="small muted">Held by HoR</span><strong>{peso(totals.held)}</strong><span className="small">Cash in, minus spent and turned over</span></div>
        </div>
        <ul className="ledger-notes small">
          <li>In-kind received: <strong>{peso(totals.inKind)}</strong> in value{totals.inKindUnvalued ? ` · ${totals.inKindUnvalued} item${totals.inKindUnvalued === 1 ? "" : "s"} not valued yet` : ""}. Listed, never counted as cash.</li>
          <li>Pledged, not in yet: <strong>{peso(totals.pledged)}</strong>. Not counted until it's received.</li>
          {totals.donationsToCheck > 0 && <li className="danger-text">{peso(totals.donationsToCheck)} in donations isn&apos;t checked against HoR&apos;s account yet (see each event&apos;s Donors page).</li>}
          {totals.missingProof > 0 && <li className="danger-text">{totals.missingProof} line{totals.missingProof === 1 ? " is" : "s are"} missing a receipt or proof.</li>}
        </ul>
      </section>

      <section className="card ledger-lines">
        <nav className="tabs" aria-label="Show">
          {TABS.filter(([k]) => !k || count(k) || kindTab === k).map(([k, label]) => (
            <a key={k || "all"} href={`${base}/ledger${qs({ kind: k })}`} aria-current={kindTab === k ? "page" : undefined}>{label} · {count(k)}</a>
          ))}
        </nav>
        <ListSearch placeholder="Search description, payee, category, event…" />
        {shown.length === 0 ? (
          <p className="muted">{lines.length ? "Nothing of this kind here." : canEdit ? "No money in or out here yet. Add an expense, or record fees and donations on each event." : "No money in or out here yet."}</p>
        ) : (
          <div className="table-wrap">
            <table className="ledger-table">
              <thead>
                <tr><th>Date</th>{!isUuid(scope) && <th>Event</th>}<th>Line</th><th>Category</th><th className="num">Amount</th><th>Proof</th>{canEdit && <th><span className="sr-only">Edit</span></th>}</tr>
              </thead>
              <tbody>
                {shown.map((l) => {
                  const entry = l.source === "manual" ? entryById[l.id] : null;
                  const proofs = entry ? filesOf(l.id) : [];
                  const out = l.kind === "expense" || l.kind === "turnover";
                  const counted = l.kind === "income" || out;
                  const category = l.source === "manual" ? categoryLabel(l.kind, l.category) : CATEGORY[l.category] || "";
                  const find = [l.description, l.party, category, KIND_LABEL[l.kind], eventTitle[l.eventId], l.reference, labelOf(LEDGER_METHODS, l.method)].filter(Boolean).join(" ").toLowerCase();
                  return (
                    <tr key={l.id} data-find={find}>
                      <td className="small nowrap">{l.date ? formatDay(l.date) : <span className="muted">—</span>}</td>
                      {!isUuid(scope) && <td className="small">{l.eventId ? <a href={`${base}/ledger${qs({ event: l.eventId, kind: kindTab })}`}>{eventTitle[l.eventId] || "Event"}</a> : <span className="muted">General</span>}</td>}
                      <td>
                        <span className="strong">{l.description}</span>
                        {(l.party || l.quantity) && <><br /><span className="small muted">{[l.party, l.quantity].filter(Boolean).join(" · ")}</span></>}
                        <br /><span className="small">
                          <span className={l.kind === "income" ? "chip good" : "chip"}>{KIND_LABEL[l.kind]}</span>
                          {l.source !== "manual" && <> <a href={sourceHref(l)} className="small">{SOURCE[l.source]}</a></>}
                          {l.method && <span className="muted"> · {labelOf(LEDGER_METHODS, l.method) || l.method}</span>}
                          {l.reference && <span className="muted"> · Ref {l.reference}</span>}
                        </span>
                      </td>
                      <td className="small">{category}</td>
                      <td className={`num ${counted ? "strong" : "muted"}`}>
                        {l.amount == null ? <span className="muted">Not valued</span> : <>{l.kind === "income" ? "+" : out ? "−" : ""}{peso(l.amount)}</>}
                        {!counted && l.amount != null && <><br /><span className="small">{l.kind === "pledge" ? "pledged" : "value"}</span></>}
                      </td>
                      <td className="small">
                        {entry ? (proofs.length ? <FileViewer files={proofs} base={base} path="ledger/file" title={`${needsProof(l.kind) ? (l.kind === "expense" ? "Receipt" : "Proof of handover") : "File"} · ${l.description}`} label={proofs.length > 1 ? `View ${proofs.length}` : "View"} /> : needsProof(l.kind) ? <span className="chip alert">Missing</span> : <span className="muted">—</span>)
                          : l.source === "donation" && l.kind === "income" ? (l.checked ? <span className="chip good">Checked</span> : <a className="chip" href={sourceHref(l)}>{l.proofs ? "To check" : "No proof yet"}</a>)
                          : <span className="muted">—</span>}
                      </td>
                      {canEdit && (
                        <td>
                          {entry && (
                            <EditDialog label="Edit" buttonClass="btn small ghost" title={l.description} lead={`${KIND_LABEL[l.kind]}${l.eventId ? ` · ${eventTitle[l.eventId] || ""}` : ""}. Changes are logged under your name.`}>
                              <LedgerEntryForm entry={entry} kinds={[entry.kind]} files={proofs} {...formProps} />
                            </EditDialog>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
