"use client";

import { useEffect, useMemo, useState } from "react";
import { saveAllAdminPages } from "../../actions";
import { startPreview } from "../../previewActions";
import ConfirmButton from "../ConfirmButton";

const LEVEL_LABEL = { "": "—", view: "View", edit: "Edit" };
const entry = (key, level) => (level === "view" ? `${key}:view` : level === "edit" ? key : "");

/**
 * Page access for every non-owner admin (owner, 2026-10-31): one grid, one
 * "Save all". Changed cells are outlined with a dot, changed rows say
 * "Changed", and the sticky bar counts the changes; only changed people are
 * sent. Leaving with unsaved changes asks first.
 */
export default function PageAccessTable({ people, pages }) {
  const original = useMemo(() => Object.fromEntries(people.map((p) => [p.email, p.levels])), [people]);
  const [levels, setLevels] = useState(original);
  const changedCells = (email) => pages.filter((pg) => (levels[email][pg.key] || "") !== (original[email][pg.key] || "")).map((pg) => pg.key);
  const changedPeople = people.filter((p) => changedCells(p.email).length > 0);
  const changeCount = people.reduce((n, p) => n + changedCells(p.email).length, 0);
  const emptyRows = changedPeople.filter((p) => pages.every((pg) => !levels[p.email][pg.key]));

  useEffect(() => {
    if (!changeCount) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [changeCount]);

  const set = (email, key, level) => setLevels((all) => ({ ...all, [email]: { ...all[email], [key]: level } }));

  return (
    <>
      <div className="table-wrap page-access-wrap">
        <table className="page-access">
          <thead>
            <tr>
              <th scope="col" className="sticky-col">Person</th>
              {pages.map((p) => <th key={p.key} scope="col"><span>{p.label}</span></th>)}
              <th scope="col"><span className="visually-hidden">Preview</span></th>
            </tr>
          </thead>
          <tbody>
            {people.map((p) => {
              const changed = changedCells(p.email);
              return (
                <tr key={p.email} className={changed.length ? "row-changed" : undefined}>
                  <th scope="row" className="strong sticky-col">
                    <span className="access-name">{p.name || p.email}</span>
                    {changed.length > 0 && <span className="access-changed-tag">● {changed.length} changed</span>}
                    {p.fromRoles && !changed.length && <span className="small muted"><br />From their roles, not saved yet</span>}
                  </th>
                  {pages.map((pg) => {
                    const level = levels[p.email][pg.key] || "";
                    const isChanged = changed.includes(pg.key);
                    return (
                      <td key={pg.key} className={`tick${isChanged ? " cell-changed" : ""}`}>
                        <select
                          className={`access ${level}${isChanged ? " is-changed" : ""}`}
                          value={level}
                          onChange={(e) => set(p.email, pg.key, e.target.value)}
                          aria-label={`${pg.label} for ${p.email}${isChanged ? ` (changed from ${LEVEL_LABEL[original[p.email][pg.key] || ""]})` : ""}`}
                          title={isChanged ? `Was ${LEVEL_LABEL[original[p.email][pg.key] || ""]}` : undefined}
                        >
                          <option value="">—</option>
                          <option value="view">View</option>
                          {pg.canEdit && <option value="edit">Edit</option>}
                        </select>
                      </td>
                    );
                  })}
                  <td>
                    <form action={startPreview}>
                      <input type="hidden" name="email" value={p.email} />
                      <ConfirmButton className="linkish small" title={`Preview the admin as ${p.email}?`} items={["You'll see exactly their menu and pages", "Changes are switched off until you exit the preview", ...(changed.length ? ["Unsaved changes on this page are lost: save them first"] : [])]} yes="Yes, preview" tone="ink">Preview</ConfirmButton>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <form action={saveAllAdminPages} className={`access-savebar${changeCount ? " has-changes" : ""}`} role="region" aria-label="Save page access">
        {changedPeople.map((p) => (
          <span key={p.email} hidden>
            <input type="hidden" name="email" value={p.email} />
            {pages.map((pg) => entry(pg.key, levels[p.email][pg.key])).filter(Boolean).map((v) => <input key={v} type="hidden" name={`pages:${p.email}`} value={v} />)}
          </span>
        ))}
        <p className="small" aria-live="polite" style={{ margin: 0 }}>
          {changeCount
            ? <><strong>● {changeCount} unsaved change{changeCount === 1 ? "" : "s"}</strong> for {changedPeople.map((p) => p.name || p.email).join(", ")}</>
            : <span className="muted">No unsaved changes. Changed boxes are outlined in gold.</span>}
          {emptyRows.length > 0 && <span className="error-text"><br />Give {emptyRows.map((p) => p.name || p.email).join(", ")} at least one page, or remove them as an admin.</span>}
        </p>
        <div className="actions">
          {changeCount > 0 && <button type="button" className="linkish" data-confirm="not-needed-read-only" onClick={() => setLevels(original)}>Undo all</button>}
          <ConfirmButton
            className="btn dark"
            disabled={!changeCount || emptyRows.length > 0}
            title={`Save page access for ${changedPeople.length} ${changedPeople.length === 1 ? "person" : "people"}?`}
            items={[...changedPeople.map((p) => `${p.name || p.email}: ${changedCells(p.email).length} page${changedCells(p.email).length === 1 ? "" : "s"} changed`), "Only pages set to View or Edit show in their sidebar", "Takes effect on their next page or action"]}
            yes="Yes, save all"
            tone="ink"
          >Save all{changeCount ? ` (${changeCount})` : ""}</ConfirmButton>
        </div>
      </form>
    </>
  );
}
