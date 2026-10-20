"use client";

import { useMemo, useState } from "react";
import { saveMediaHub } from "../../mediaActions";
import ConfirmButton from "../ConfirmButton";

const FIELDS = [
  ["heroTitle", "Hero headline", "Use <br> for a line break and <em> for gold emphasis."],
  ["heroLead", "Hero introduction", "Keep this to one or two sentences."],
  ["about", "About the Society", "Separate paragraphs with a blank line."],
  ["mission", "Mission", "Use the approved wording only."],
  ["stories", "Impact and story notes", "One story per paragraph. Label upcoming or proposed work clearly."],
  ["partnerships", "Partnership information", "Describe the ways partners can work with HOR."],
];

function Preview({ values }) {
  const html = (value) => ({ __html: value.replace(/\n\n/g, "<br><br>") });
  return (
    <div className="media-editor-preview" aria-label="Live media hub preview">
      <div className="media-preview-hero"><p>PRESS · PARTNERSHIPS · STORIES</p><h2 dangerouslySetInnerHTML={html(values.heroTitle)} /><div dangerouslySetInnerHTML={html(values.heroLead)} /></div>
      <div className="media-preview-body"><p className="media-preview-label">THE SOCIETY</p><h3>Good dogs. Good people. Greater good.</h3><div dangerouslySetInnerHTML={html(values.about)} /><p className="media-preview-label">MISSION</p><div dangerouslySetInnerHTML={html(values.mission)} /><p className="media-preview-label">STORIES</p><div dangerouslySetInnerHTML={html(values.stories)} /><p className="media-preview-label">PARTNERSHIPS</p><div dangerouslySetInnerHTML={html(values.partnerships)} /></div>
    </div>
  );
}

export default function MediaEditor({ content, status, updatedAt, updatedBy }) {
  const [values, setValues] = useState(content);
  const preview = useMemo(() => values, [values]);
  return (
    <form className="media-admin-editor" action={saveMediaHub}>
      <div className="media-editor-toolbar"><div><span className={`chip ${status === "published" ? "good" : "warn"}`}>{status === "published" ? "Published" : "Draft"}</span>{updatedAt && <small>Last updated by {updatedBy || "HOR"}</small>}</div><div className="actions"><ConfirmButton className="btn ghost" name="intent" value="draft" title="Save this media hub draft?" items={["Save the current media hub wording as a private draft.", "Nothing public will change until it is published."]} yes="Save draft" tone="ghost">Save draft</ConfirmButton><ConfirmButton className="btn gold" name="intent" value="publish" title="Publish these media hub changes?" items={["Make the current media hub wording public.", "This replaces the currently published copy."]} note="Check every fact, date, name, and label before publishing." yes="Publish changes">Publish changes</ConfirmButton></div></div>
      <div className="media-editor-layout"><div className="media-editor-fields"><section className="card"><h2>Content</h2><p className="muted small">This editor uses a limited rich-text format so the public design stays accessible and on-brand.</p>{FIELDS.map(([name, label, help]) => <label className="field" key={name}><span>{label}</span><small>{help}</small><textarea name={name} value={values[name] || ""} onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.value }))} /></label>)}</section><section className="card"><h2>Search and contact</h2><div className="grid-2"><label className="field"><span>Media email</span><input name="contactEmail" type="email" value={values.contactEmail || ""} onChange={(event) => setValues((current) => ({ ...current, contactEmail: event.target.value }))} /></label><label className="field"><span>SEO title</span><input name="seoTitle" value={values.seoTitle || ""} onChange={(event) => setValues((current) => ({ ...current, seoTitle: event.target.value }))} /></label></div><label className="field"><span>SEO description</span><textarea name="seoDescription" value={values.seoDescription || ""} onChange={(event) => setValues((current) => ({ ...current, seoDescription: event.target.value }))} /></label></section></div><aside><div className="card media-editor-sticky"><h2>Live preview</h2><Preview values={preview} /><p className="muted small">Preview uses the same content fields that will be shown publicly. Images, downloads, and additional blocks will be added in the next editor phase.</p></div></aside></div>
    </form>
  );
}
