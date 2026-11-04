"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cleanDoc, renderDesign } from "../../../../../lib/emailDesign.mjs";
import { resizeImageWithin } from "../../../../../lib/resizeImage";
import { saveDesign, resetHouse, sendDesignTest, uploadDesignImage } from "../../../../emailDesignActions";
import ConfirmButton from "../../../ConfirmButton";
import RichText from "./RichText";
import StyleFields, { BoxField, ColorField } from "./StyleFields";

const NEW = {
  text: () => ({ type: "text", html: "<p>New text</p>", size: 16, style: {} }),
  image: () => ({ type: "image", src: "", width: 100, alt: "", style: { align: "center" } }),
  columns: () => ({ type: "columns", count: 2, style: {}, cols: [{ blocks: [NEW.text()] }, { blocks: [NEW.text()] }] }),
  button: () => ({ type: "button", label: "Open", href: "https://www.houseofretrieversph.org/", color: "#a78440", textColor: "#0d0d0d", style: { align: "center" } }),
  divider: () => ({ type: "divider", color: "#ede7d8", thickness: 1, style: {} }),
  space: () => ({ type: "space", height: 16, style: {} }),
};
const LABEL = { text: "Text", image: "Image", columns: "Columns", button: "Button", divider: "Divider", space: "Space" };
const ZONE_LABEL = { header: "Header", body: "Body", footer: "Footer" };
const FILL_INS = "[Salutation] [Company Name] [Their Contact Person] [Event Name] [Event Date] [Event Time] [Event Location] [Event Link] [Event Beneficiaries] [Signatory Name] [Signatory Position]";
const plain = (html) => String(html || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const summary = (b) => b.type === "text" ? plain(b.html).slice(0, 40) || "Empty text" : b.type === "image" ? (b.src ? b.alt || "Picture" : "No picture yet") : b.type === "button" ? b.label : b.type === "columns" ? `${b.count} columns` : b.type === "space" ? `${b.height}px` : "";
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * The block editor (owner, 2026-11-04): Header, Body and Footer as lists of blocks
 * (text, image, columns, button, divider, space) with background, padding, margin and
 * alignment; text formatting in a document-style box; a live preview at desktop or
 * phone width. Designs use HOR's shared header/footer unless switched to their own.
 */
export default function DesignEditor({ id, isHouse, initial, name: startName, subject: startSubject, house, canEdit, ready, me }) {
  const [doc, setDoc] = useState(() => structuredClone({ header: { style: {}, blocks: [] }, body: { style: {}, blocks: [] }, footer: { style: {}, blocks: [] }, ...initial }));
  const [name, setName] = useState(startName);
  const [subject, setSubject] = useState(startSubject);
  const [sel, setSel] = useState(null); // { zone, i?, c?, j? }
  const [width, setWidth] = useState(600);
  const [uploading, setUploading] = useState("");
  const saved = useRef({ doc: JSON.stringify(doc), name: startName, subject: startSubject });
  const dirty = JSON.stringify(doc) !== saved.current.doc || name !== saved.current.name || subject !== saved.current.subject;

  useEffect(() => {
    const warn = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // Preview: the cleaned document, or the last one that was fine while something is half-typed.
  const lastGood = useRef(null);
  const checked = useMemo(() => cleanDoc(doc), [doc]);
  if (checked.doc) lastGood.current = checked.doc;
  const preview = useMemo(() => (lastGood.current ? renderDesign(lastGood.current, { house, subject }).html : ""), [checked, house, subject]); // eslint-disable-line react-hooks/exhaustive-deps

  const zones = isHouse ? ["header", "footer"] : ["header", "body", "footer"];
  const owns = (zone) => isHouse || zone === "body" || (zone === "header" ? doc.ownHeader : doc.ownFooter);
  const edit = (fn) => setDoc((d) => { const next = structuredClone(d); fn(next); return next; });
  const listOf = (d, s) => (s.c == null ? d[s.zone].blocks : d[s.zone].blocks[s.i].cols[s.c].blocks);
  const indexOf = (s) => (s.c == null ? s.i : s.j);
  const blockAt = (d, s) => (s && s.i != null ? (s.c == null ? d[s.zone].blocks[s.i] : d[s.zone].blocks[s.i]?.cols[s.c]?.blocks[s.j]) : null);
  const selected = blockAt(doc, sel);
  const update = (patch) => edit((d) => { Object.assign(blockAt(d, sel), patch); });

  function add(zone, type, i = null, c = null) {
    edit((d) => {
      const list = c == null ? d[zone].blocks : d[zone].blocks[i].cols[c].blocks;
      list.push(NEW[type]());
      setSel(c == null ? { zone, i: list.length - 1 } : { zone, i, c, j: list.length - 1 });
    });
  }
  function move(s, by) {
    edit((d) => {
      const list = listOf(d, s);
      const at = indexOf(s);
      const to = at + by;
      if (to < 0 || to >= list.length) return;
      [list[at], list[to]] = [list[to], list[at]];
      setSel(s.c == null ? { ...s, i: to } : { ...s, j: to });
    });
  }
  function remove(s) {
    edit((d) => { listOf(d, s).splice(indexOf(s), 1); });
    setSel(null);
  }
  function setOwn(zone, on) {
    edit((d) => {
      const key = zone === "header" ? "ownHeader" : "ownFooter";
      d[key] = on;
      if (on && !d[zone].blocks.length) d[zone] = structuredClone(house[zone]);
    });
    setSel(on ? { zone } : null);
  }
  function setColumns(count) {
    edit((d) => {
      const b = blockAt(d, sel);
      b.count = count;
      while (b.cols.length < count) b.cols.push({ blocks: [NEW.text()] });
      b.cols = b.cols.slice(0, count);
    });
  }
  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading("Uploading…");
    try {
      let dataUrl;
      if (/^image\/png$/.test(file.type) && file.size <= 700 * 1024) {
        dataUrl = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); });
      } else {
        dataUrl = (await resizeImageWithin(file, 700 * 1024)).dataUrl;
      }
      const out = await uploadDesignImage(dataUrl);
      if (out.error) setUploading(out.error);
      else { update({ src: out.src, alt: blockAt(doc, sel)?.alt || file.name.replace(/\.[a-z]+$/i, "") }); setUploading(""); }
    } catch {
      setUploading("That picture couldn't be read. Try a PNG or JPG.");
    }
    event.target.value = "";
  }

  const isSel = (s) => same(s, sel);
  const row = (b, s) => (
    <li key={JSON.stringify(s)} className={`design-block${isSel(s) ? " is-selected" : ""}`}>
      <button type="button" className="design-block-pick" data-confirm="not-needed-read-only" onClick={() => setSel(s)} aria-pressed={isSel(s)}>
        <strong>{LABEL[b.type]}</strong> <span className="small muted">{summary(b)}</span>
      </button>
      {canEdit && (
        <span className="design-block-tools">
          <button type="button" className="rt-tool" data-confirm="not-needed-read-only" aria-label="Move up" onClick={() => move(s, -1)}>↑</button>
          <button type="button" className="rt-tool" data-confirm="not-needed-read-only" aria-label="Move down" onClick={() => move(s, 1)}>↓</button>
          <button type="button" className="rt-tool" data-confirm="not-needed-read-only" aria-label={`Delete this ${LABEL[b.type].toLowerCase()}`} onClick={() => remove(s)}>✕</button>
        </span>
      )}
      {b.type === "columns" && (
        <div className="design-cols">
          {b.cols.map((col, c) => (
            <div key={c} className="design-col">
              <span className="small muted">Column {c + 1}</span>
              <ul className="design-blocks">{col.blocks.map((inner, j) => row(inner, { ...s, c, j }))}</ul>
              {canEdit && <span className="design-add small">{["text", "image", "button"].map((t) => <button key={t} type="button" data-confirm="not-needed-read-only" onClick={() => add(s.zone, t, s.i, c)}>+ {LABEL[t]}</button>)}</span>}
            </div>
          ))}
        </div>
      )}
    </li>
  );

  return (
    <div className="design-editor">
      <section className="card design-structure">
        {!isHouse && (
          <div className="form" style={{ gap: 10, marginBottom: 12 }}>
            <label className="field"><span>Name <small>Only admins see this</small></span><input type="text" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} disabled={!canEdit} /></label>
            <label className="field"><span>Email subject <small>Fill-ins work here too</small></span><input type="text" value={subject} maxLength={150} onChange={(e) => setSubject(e.target.value)} disabled={!canEdit} /></label>
          </div>
        )}
        {zones.map((zone) => (
          <div key={zone} className={`design-zone${sel?.zone === zone && sel.i == null ? " is-selected" : ""}`}>
            <div className="design-zone-head">
              <button type="button" className="design-block-pick" data-confirm="not-needed-read-only" onClick={() => owns(zone) && setSel({ zone })}><strong>{ZONE_LABEL[zone]}</strong>{owns(zone) && <span className="small muted"> · zone style</span>}</button>
              {!isHouse && zone !== "body" && canEdit && (
                owns(zone)
                  ? <button type="button" className="btn ghost small" data-confirm="not-needed-read-only" onClick={() => setOwn(zone, false)}>Use HOR {zone}</button>
                  : <button type="button" className="btn ghost small" data-confirm="not-needed-read-only" onClick={() => setOwn(zone, true)}>Use its own {zone}</button>
              )}
            </div>
            {owns(zone) ? (
              <>
                <ul className="design-blocks">{doc[zone].blocks.map((b, i) => row(b, { zone, i }))}</ul>
                {canEdit && <span className="design-add small">{Object.keys(NEW).map((t) => <button key={t} type="button" data-confirm="not-needed-read-only" onClick={() => add(zone, t)}>+ {LABEL[t]}</button>)}</span>}
              </>
            ) : <p className="small muted" style={{ margin: "6px 0 0" }}>Uses the HOR {zone} (shared). <a href="./house">Edit it</a> for every design, or switch this one to its own.</p>}
          </div>
        ))}
        <p className="small muted">Fill-ins you can use: {FILL_INS}</p>
      </section>

      <section className="card design-settings">
        {!sel && <p className="muted">Pick a block or a zone to change it.</p>}
        {sel && sel.i == null && (
          <>
            <h2 style={{ margin: 0 }}>{ZONE_LABEL[sel.zone]} style</h2>
            <StyleFields style={doc[sel.zone].style} onChange={(st) => edit((d) => { d[sel.zone].style = st; })} disabled={!canEdit} />
          </>
        )}
        {selected && (
          <>
            <h2 style={{ margin: 0 }}>{LABEL[selected.type]}</h2>
            {selected.type === "text" && (
              <>
                <RichText key={JSON.stringify(sel)} html={selected.html} onChange={(html) => update({ html })} disabled={!canEdit} />
                <div className="row-2">
                  <label className="field"><span>Base size (px)</span><input type="number" min={12} max={40} value={selected.size || 16} onChange={(e) => update({ size: Number(e.target.value) || 16 })} disabled={!canEdit} /></label>
                  <ColorField label="Base text colour" value={selected.color || ""} onChange={(color) => update({ color })} disabled={!canEdit} />
                </div>
              </>
            )}
            {selected.type === "image" && (
              <>
                <label className="field"><span>Picture <small>PNG or JPG; shrunk to fit email</small></span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} disabled={!canEdit} /></label>
                {uploading && <p className="small" role="status">{uploading}</p>}
                <label className="field"><span>Width: {selected.width}% of the email</span><input type="range" min={10} max={100} step={5} value={selected.width} onChange={(e) => update({ width: Number(e.target.value) })} disabled={!canEdit} /></label>
                <label className="field"><span>Description <small>Shown if pictures are off</small></span><input type="text" maxLength={200} value={selected.alt || ""} onChange={(e) => update({ alt: e.target.value })} disabled={!canEdit} /></label>
                <label className="field"><span>Link <small>Optional: https://… or a fill-in like [Event Link]</small></span><input type="text" value={selected.href || ""} onChange={(e) => update({ href: e.target.value })} disabled={!canEdit} /></label>
              </>
            )}
            {selected.type === "button" && (
              <>
                <label className="field"><span>Label</span><input type="text" maxLength={60} value={selected.label} onChange={(e) => update({ label: e.target.value })} disabled={!canEdit} /></label>
                <label className="field"><span>Link <small>https://…, mailto:… or a fill-in like [Event Link]</small></span><input type="text" value={selected.href} onChange={(e) => update({ href: e.target.value })} disabled={!canEdit} /></label>
                <div className="row-2">
                  <ColorField label="Button colour" value={selected.color} allowEmpty={false} onChange={(color) => update({ color })} disabled={!canEdit} />
                  <ColorField label="Label colour" value={selected.textColor} allowEmpty={false} onChange={(textColor) => update({ textColor })} disabled={!canEdit} />
                </div>
              </>
            )}
            {selected.type === "divider" && (
              <div className="row-2">
                <ColorField label="Line colour" value={selected.color} allowEmpty={false} onChange={(color) => update({ color })} disabled={!canEdit} />
                <label className="field"><span>Thickness (px)</span><input type="number" min={1} max={6} value={selected.thickness} onChange={(e) => update({ thickness: Number(e.target.value) || 1 })} disabled={!canEdit} /></label>
              </div>
            )}
            {selected.type === "space" && <label className="field"><span>Height (px)</span><input type="number" min={4} max={80} value={selected.height} onChange={(e) => update({ height: Number(e.target.value) || 16 })} disabled={!canEdit} /></label>}
            {selected.type === "columns" && (
              <div className="field">
                <span className="field-head">Columns <small>They stack on phones</small></span>
                <span className="seg" role="group" aria-label="Number of columns">{[2, 3].map((n) => <button key={n} type="button" data-confirm="not-needed-read-only" aria-pressed={selected.count === n} onClick={() => setColumns(n)} disabled={!canEdit}>{n}</button>)}</span>
              </div>
            )}
            <StyleFields style={selected.style} onChange={(st) => update({ style: st })} disabled={!canEdit} />
          </>
        )}
      </section>

      <section className="card design-preview">
        <div className="actions" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
          <span className="seg" role="group" aria-label="Preview width">
            <button type="button" data-confirm="not-needed-read-only" aria-pressed={width === 600} onClick={() => setWidth(600)}>Desktop</button>
            <button type="button" data-confirm="not-needed-read-only" aria-pressed={width === 375} onClick={() => setWidth(375)}>Phone</button>
          </span>
          {dirty && <span className="small"><strong>● Unsaved changes</strong></span>}
        </div>
        {checked.error && <p className="small error-text" role="alert">{checked.error}</p>}
        <iframe title="Email preview" className="design-frame" style={{ width: Math.min(width, 640) }} srcDoc={preview} sandbox="" />
        {canEdit && (
          <div className="actions" style={{ flexWrap: "wrap" }}>
            <form action={saveDesign}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="doc" value={JSON.stringify(doc)} />
              <input type="hidden" name="name" value={name} />
              <input type="hidden" name="subject" value={subject} />
              <ConfirmButton className="btn dark" disabled={Boolean(checked.error) || !dirty} title={isHouse ? "Save HOR's header and footer?" : `Save “${name || "this design"}”?`} items={isHouse ? ["Every design that uses the HOR header or footer shows the change", "Nothing is sent"] : ["The design is updated for the next send", "Emails already sent are unchanged"]} yes="Yes, save">Save</ConfirmButton>
            </form>
            {!isHouse && (
              <form action={sendDesignTest}>
                <input type="hidden" name="id" value={id} />
                <ConfirmButton className="btn ghost" disabled={!ready || dirty} title="Send a test to yourself?" items={[`Goes to ${me} only, with sample fill-ins`, "The saved version is sent"]} yes="Yes, send the test">{dirty ? "Save first to send a test" : "Send a test to me"}</ConfirmButton>
              </form>
            )}
            {isHouse && (
              <form action={resetHouse}>
                <ConfirmButton className="btn ghost" tone="alert" title="Go back to HOR's standard header and footer?" items={["Your saved header and footer are replaced by the standard ones"]} yes="Yes, go back">Use the standard ones</ConfirmButton>
              </form>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
