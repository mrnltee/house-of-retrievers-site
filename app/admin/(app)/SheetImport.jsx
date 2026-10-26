"use client";

import { useState } from "react";
import { IMPORT_TARGETS, MAX_IMPORT_ROWS, autoMatch, mapRows } from "../../lib/admin/sheetImport.mjs";
import { parseCsv } from "../../lib/admin/peopleImport.mjs";
import { importSheet } from "../importActions";

const STATUS_LABEL = { add: "Will be added", skip: "Skipped", error: "Needs fixing" };

/**
 * Import from Excel or CSV (owner, 2026-10-27): pick a file, check the column
 * matches, Check, then Import. The file is read here in the browser; only the
 * matched values are sent. Existing records are skipped, nothing is emailed.
 */
export default function SheetImport({ target, eventId, backHref }) {
  const { fields, title } = IMPORT_TARGETS[target];
  const [sheet, setSheet] = useState(null); // { name, rows }
  const [match, setMatch] = useState({});
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function onFile(e) {
    const file = e.target.files?.[0];
    setReport(null);
    setError("");
    setSheet(null);
    if (!file) return;
    try {
      let rows;
      if (/\.csv$/i.test(file.name) || file.type === "text/csv") rows = parseCsv(await file.text());
      else if (/\.xlsx$/i.test(file.name)) {
        const { readSheet } = await import("read-excel-file/browser");
        rows = await readSheet(file);
      } else {
        setError("Choose an Excel (.xlsx) or CSV file. In Google Sheets: File → Download → Microsoft Excel or CSV.");
        return;
      }
      rows = rows.filter((r) => r.some((c) => c != null && String(c).trim() !== ""));
      if (rows.length < 2) { setError("That sheet has no rows under its header row."); return; }
      if (rows.length - 1 > MAX_IMPORT_ROWS) { setError(`That sheet has ${rows.length - 1} rows; import up to ${MAX_IMPORT_ROWS} at a time.`); return; }
      setSheet({ name: file.name, rows });
      setMatch(autoMatch(rows[0], target));
    } catch {
      setError("That file couldn't be read. If it's an old .xls file, save it as .xlsx or CSV first.");
    }
  }

  const headers = sheet ? sheet.rows[0].map((h, i) => String(h ?? "").trim() || `Column ${i + 1}`) : [];
  const missing = fields.filter((f) => f.required && match[f.key] === undefined);
  const mapped = sheet ? mapRows(sheet.rows, match) : [];

  async function run(commit) {
    setBusy(commit ? "import" : "check");
    setError("");
    const result = await importSheet({ target, eventId, rows: mapped, commit }).catch(() => ({ error: "Something went wrong. Try again." }));
    setBusy("");
    if (result.error) { setError(result.error); return; }
    setReport(result);
  }

  const counts = report ? ["add", "skip", "error"].map((s) => report.results.filter((r) => r.status === s).length) : [];

  return (
    <div className="form" style={{ gap: 20 }}>
      <section className="card form">
        <h2>1. Choose the file</h2>
        <p className="small muted">Excel (.xlsx) or CSV, with a header row. The first sheet is used. Up to {MAX_IMPORT_ROWS} rows.</p>
        <input type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={onFile} />
        {sheet && <p className="small">{sheet.name}: {sheet.rows.length - 1} rows, {headers.length} columns.</p>}
      </section>

      {sheet && (
        <section className="card form">
          <h2>2. Match the columns</h2>
          <p className="small muted">Matched by column name. Change any that are wrong; leave “Not in the sheet” for fields you don't have.</p>
          <div className="import-map">
            {fields.map((field) => (
              <label key={field.key} className="field">
                <span>{field.label}{field.required ? " *" : ""}{field.hint ? <small> {field.hint}</small> : null}</span>
                <select value={match[field.key] ?? ""} onChange={(e) => { setReport(null); setMatch((m) => { const next = { ...m }; if (e.target.value === "") delete next[field.key]; else next[field.key] = Number(e.target.value); return next; }); }}>
                  <option value="">Not in the sheet</option>
                  {headers.map((h, i) => <option key={i} value={i}>{h}{sheet.rows[1]?.[i] != null && String(sheet.rows[1][i]).trim() ? ` — e.g. ${String(sheet.rows[1][i]).slice(0, 30)}` : ""}</option>)}
                </select>
              </label>
            ))}
          </div>
          {missing.length > 0 && <p className="banner alert small" style={{ margin: 0 }}>Still to match: {missing.map((f) => f.label).join(", ")}.</p>}
          <div className="actions">
            <button type="button" className="btn gold" disabled={missing.length > 0 || Boolean(busy)} onClick={() => run(false)}>{busy === "check" ? "Checking…" : `Check ${mapped.length} rows`}</button>
          </div>
        </section>
      )}

      {error && <p className="banner alert small" role="alert" style={{ margin: 0 }}>{error}</p>}

      {report && (
        <section className="card form" aria-live="polite">
          <h2>{report.committed ? "3. Imported" : "3. Check the result"}</h2>
          <p>
            <strong>{counts[0]}</strong> {report.committed ? "added" : "will be added"} · <strong>{counts[1]}</strong> skipped (already here) · <strong>{counts[2]}</strong> need fixing
          </p>
          {report.results.some((r) => r.status !== "add") && (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Row</th><th>Name</th><th>Result</th></tr></thead>
                <tbody>
                  {report.results.filter((r) => r.status !== "add").map((r) => (
                    <tr key={r.line}><td>{r.line}</td><td>{r.name || "—"}</td><td><strong>{STATUS_LABEL[r.status]}:</strong> {r.reason}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!report.committed ? (
            <div className="actions">
              <button type="button" className="btn gold" disabled={!counts[0] || Boolean(busy)} onClick={() => run(true)}>{busy === "import" ? "Importing…" : `Import ${counts[0]} ${title.toLowerCase()}`}</button>
              <span className="small muted">Rows that need fixing or are already here are left out. No emails are sent.</span>
            </div>
          ) : (
            <p className="small"><a href={backHref}>Back to {title} →</a> {counts[2] > 0 ? "Fix the rows above in the sheet and import it again — rows already added will be skipped." : ""}</p>
          )}
        </section>
      )}
    </div>
  );
}
