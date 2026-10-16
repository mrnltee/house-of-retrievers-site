import { notFound } from "next/navigation";
import { sql } from "../../../../lib/db";
import { normalizeCode } from "../../../../lib/admin/registrations.mjs";
import ConsentForm from "./ConsentForm";
import { consentTemplate } from "../../../../lib/admin/events.mjs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Event acknowledgement | House of Retrievers", robots: { index: false, follow: false } };

export default async function ConsentPage({ params }) {
  const code = normalizeCode((await params).code);
  if (!code) notFound();
  const [row] = await sql(`SELECT r.id, r.name, r.furbaby_name, r.under_18, r.guardian_name, r.consent_completed_at, r.consent_name, e.title, e.date, e.venue, e.city, e.rsvp_form_config FROM registrations r JOIN events e ON e.id=r.event_id WHERE r.check_in_code=$1 AND r.deleted_at IS NULL`, [code]);
  if (!row || row.status === "cancelled" || !row.rsvp_form_config?.consentEnabled) notFound();
  const template = consentTemplate(row.rsvp_form_config.consentTemplate);
  return <main className="rsvp-pass consent-page"><section className="rsvp-pass-card consent-card"><p className="eyebrow">Event acknowledgement</p><h1>{row.title}</h1><p className="rsvp-pass-when">{row.venue}{row.city ? ` · ${row.city}` : ""}</p><p>{row.rsvp_form_config.consentIntro || template.intro}</p><div className="consent-sections">{template.sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2>{section.body && <p>{section.body}</p>}{section.bullets && <ul>{section.bullets.map((item) => <li key={item}>{item}</li>)}</ul>}</section>)}</div><div className="banner note small">This acknowledgement is attached to your registration. It does not change your RSVP, payment, or QR pass.</div><ConsentForm code={code} name={row.name} furbabyName={row.furbaby_name} under18={row.under_18} guardianName={row.guardian_name} completedAt={row.consent_completed_at} consentName={row.consent_name} /></section></main>;
}
