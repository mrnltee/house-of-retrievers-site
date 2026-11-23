import { adminBase, pageAdmin } from "../../../../lib/admin/guard";
import { eventBreakdown, transparencyReport } from "../../../../lib/ledger.mjs";
import { loadLedger } from "../../../../lib/ledgerStore";
import { manilaDate } from "../../../../lib/journeyEntries.mjs";
import { formatPeso } from "../../../../lib/prices.mjs";
import { NotAllowed, formatDay } from "../../ui";
import { LEGAL } from "../../../../lib/legal.mjs";
import PrintButton from "./PrintButton";
import Icon from "../../../../components/Icon";

const isUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ""));

/**
 * The transparency report (owner, 22 Nov 2026), for one event, general lines, or all events: cash raised by
 * source, expenses by category line by line, turnovers to beneficiaries, what HoR holds, then in-kind items
 * and pledges (listed, never counted as cash). Private: HoR shares the page or its PDF as it chooses. Donors
 * and givers who asked not to be named aren't, and brand amounts show per brand only where agreed.
 */
export default async function TransparencyReportPage({ searchParams }) {
  const query = await searchParams;
  const { allowed } = await pageAdmin("ledger:view");
  if (!allowed) return <NotAllowed />;
  const base = await adminBase();
  const scope = isUuid(query.event) ? query.event : query.event === "general" ? "general" : "";
  const { lines, events } = await loadLedger(scope || "all");
  const report = transparencyReport(lines);
  const t = report.totals;
  const event = isUuid(scope) ? events.find((e) => e.id === scope) : null;
  const title = event ? event.title : scope === "general" ? "HoR's general funds (not tied to an event)" : "All events";
  const rows = scope ? [] : eventBreakdown(lines, events);
  const peso = (n) => formatPeso(Number(n) || 0);
  const qs = scope ? `?event=${scope}` : "";

  return (
    <article className="ledger-report">
      <div className="ledger-report-tools no-print">
        <a className="btn ghost small" href={`${base}/ledger${qs}`}><Icon name="arrowLeft" /> Back to the ledger</a>
        <a className="btn dark small" href={`${base}/ledger/report/pdf${qs}`}>Download PDF</a>
        <PrintButton />
        <p className="small muted" style={{ margin: 0 }}>Private until HoR shares it. Check every line before sharing.</p>
      </div>

      <header className="ledger-report-head">
        <p className="eyebrow">The House of Retrievers’ Society, Inc. · Transparency report</p>
        <h1>{title}</h1>
        <p className="muted">{event?.date ? `Event date ${formatDay(event.date)} · ` : ""}Prepared {formatDay(manilaDate())}. Amounts in Philippine pesos.</p>
      </header>

      <section aria-labelledby="r-summary">
        <h2 id="r-summary">Summary</h2>
        <table className="ledger-report-table">
          <tbody>
            <tr><th scope="row">Cash raised</th><td className="num">{peso(t.cashIn)}</td></tr>
            <tr><th scope="row">Less: expenses</th><td className="num">−{peso(t.spent)}</td></tr>
            <tr className="sub"><th scope="row">Net proceeds</th><td className="num">{peso(t.net)}</td></tr>
            <tr><th scope="row">Turned over to beneficiaries (cash)</th><td className="num">−{peso(t.turnedOver)}</td></tr>
            <tr className="total"><th scope="row">Held by HoR</th><td className="num">{peso(t.held)}</td></tr>
          </tbody>
        </table>
        <p className="small muted">Also given to beneficiaries in goods: {peso(t.goodsTurnedOver)}. In-kind support received: {peso(t.inKind)} in value. Neither is counted as cash.</p>
      </section>

      {rows.length > 0 && (
        <section aria-labelledby="r-events">
          <h2 id="r-events">By event</h2>
          <table className="ledger-report-table">
            <thead><tr><th>Event</th><th className="num">Cash raised</th><th className="num">Expenses</th><th className="num">Turned over</th><th className="num">Held</th></tr></thead>
            <tbody>{rows.map((r) => <tr key={r.id || "general"}><td>{r.title}{r.date ? <span className="small muted"> · {formatDay(r.date)}</span> : null}</td><td className="num">{peso(r.cashIn)}</td><td className="num">{peso(r.spent)}</td><td className="num">{peso(r.turnedOver)}</td><td className="num">{peso(r.held)}</td></tr>)}</tbody>
          </table>
        </section>
      )}

      <section aria-labelledby="r-in">
        <h2 id="r-in">Cash raised</h2>
        {report.income.length ? (
          <table className="ledger-report-table">
            <tbody>
              {report.income.map((s) => (
                <SectionRows key={s.key} label={s.label} amount={s.amount} items={s.items.map((i) => ({ label: i.label, amount: i.amount }))} peso={peso} />
              ))}
              <tr className="total"><th scope="row">Total cash raised</th><td className="num">{peso(t.cashIn)}</td></tr>
            </tbody>
          </table>
        ) : <p className="muted">No cash raised yet.</p>}
      </section>

      <section aria-labelledby="r-out">
        <h2 id="r-out">Expenses</h2>
        {report.expenses.length ? (
          <table className="ledger-report-table">
            <tbody>
              {report.expenses.map((s) => (
                <SectionRows key={s.key} label={s.label} amount={s.amount} items={s.items.map((i) => ({ label: [i.date ? formatDay(i.date) : "", i.label, i.party ? `paid to ${i.party}` : ""].filter(Boolean).join(" · "), amount: i.amount }))} peso={peso} />
              ))}
              <tr className="total"><th scope="row">Total expenses</th><td className="num">{peso(t.spent)}</td></tr>
            </tbody>
          </table>
        ) : <p className="muted">No expenses recorded.</p>}
        <p className="small muted">Every expense is backed by a receipt kept by HoR{t.missingProof ? ` (${t.missingProof} line${t.missingProof === 1 ? " is" : "s are"} still missing one)` : ""}.</p>
      </section>

      <section aria-labelledby="r-turn">
        <h2 id="r-turn">Turned over to beneficiaries</h2>
        {report.turnovers.length ? (
          <table className="ledger-report-table">
            <tbody>
              {report.turnovers.map((i, n) => <tr key={n}><td>{[i.date ? formatDay(i.date) : "", i.label, i.form === "goods" ? `goods: ${i.description}` : i.description].filter(Boolean).join(" · ")}</td><td className="num">{peso(i.amount)}</td></tr>)}
              <tr className="total"><th scope="row">Total turned over</th><td className="num">{peso(t.turnedOver + t.goodsTurnedOver)}</td></tr>
            </tbody>
          </table>
        ) : <p className="muted">Nothing turned over yet.</p>}
      </section>

      <section aria-labelledby="r-kind">
        <h2 id="r-kind">In-kind support received</h2>
        {report.inKind.length ? (
          <table className="ledger-report-table">
            <tbody>
              {report.inKind.map((i, n) => <tr key={n}><td>{[i.label, i.quantity, i.party].filter(Boolean).join(" · ")}</td><td className="num">{i.amount == null ? <span className="muted">—</span> : peso(i.amount)}</td></tr>)}
            </tbody>
          </table>
        ) : <p className="muted">No in-kind support recorded.</p>}
        <p className="small muted">Values are estimates and are not counted as cash.</p>
      </section>

      {report.pledges && (
        <section aria-labelledby="r-pledge">
          <h2 id="r-pledge">Pledges not yet received</h2>
          <p>{report.pledges.count} pledge{report.pledges.count === 1 ? "" : "s"} totalling {peso(report.pledges.amount)}. Not counted until received.</p>
        </section>
      )}

      <div className="small muted ledger-report-foot">
        <p>Donors and givers who asked not to be named are not named. A partner&apos;s or sponsor&apos;s amount is shown on its own only where they agreed; the totals always include every amount. {t.donationsToCheck ? `${peso(t.donationsToCheck)} in donations is still being checked against HoR's account.` : "Every donation counted here has been checked against HoR's account."}</p>
        <p>{LEGAL.org} · SEC Registration {LEGAL.sec} · houseofretrieversph.org</p>
      </div>
    </article>
  );
}

function SectionRows({ label, amount, items, peso }) {
  return (
    <>
      <tr className="sub"><th scope="row">{label}</th><td className="num">{peso(amount)}</td></tr>
      {items.map((i, n) => <tr key={n} className="item"><td>{i.label}</td><td className="num">{i.amount == null ? "" : peso(i.amount)}</td></tr>)}
    </>
  );
}
