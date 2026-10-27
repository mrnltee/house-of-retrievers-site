import { sql } from "../../../lib/db";
import { adminBase, pageAdmin } from "../../../lib/admin/guard";
import { PAGES, can } from "../../../lib/admin/roles.mjs";
import { PageHead } from "../ui";

/**
 * Getting started (owner, 2026-10-27): a short guide for first-time admins,
 * showing only the pages this person can use and whether they can change
 * things there. Opening it once hides the welcome box.
 */
const HOW = {
  dashboard: { what: "A quick look at what needs attention: upcoming events, new sign-ups, waiting payments.", view: "Read only.", edit: "" },
  events: { what: "Every event: date, venue, tickets, poster and whether registration is open.", view: "Open any event to read its details.", edit: "Create an event with “Create event”, edit one by opening it, and Save. Posters are 4:5; the cropper shows the frame." },
  registrations: { what: "Who signed up for each event, their tickets and payments.", view: "Pick an event to see its list and each person's details.", edit: "Add people by hand or import a spreadsheet, confirm payments, and edit or remove a registration." },
  checkin: { what: "Event-day check-in.", view: "See who is expected and who has arrived.", edit: "Pick the event, then scan each guest's QR code (or find their name) to check them in." },
  people: { what: "Members, volunteers, sponsors and partners who joined through the website.", view: "Search and read each person's details.", edit: "Update their status and notes, send them an email, or import a list." },
  supporters: { what: "Sponsors and partners and what each gives.", view: "Read each sponsor's details and history.", edit: "Add or edit a sponsor, import a spreadsheet, or delete a test entry." },
  media: { what: "Photos and files used on the website.", view: "Browse what's there.", edit: "Upload, replace or remove photos." },
  payments: { what: "Where supporters send money (GCash, Maya, bank).", view: "See the current payment details.", edit: "Ask for a change. A different Owner must approve it before it goes live." },
  emails: { what: "The emails the website sends (confirmations, reminders).", view: "Read each template.", edit: "Edit the wording and send yourself a test first." },
  letters: { what: "Invitation and sponsorship letters, sent as PDFs.", view: "Read letters and preview the PDF.", edit: "Edit a letter, fill it in for someone and send it. Check the “Actual PDF” preview before sending." },
  journey: { what: "The “Our journey” timeline on the homepage.", view: "Read the stops.", edit: "Add or edit a stop and its photos, then publish it." },
  breeds: { what: "The small breed icons shown with registrations.", view: "See the icons.", edit: "Add or change an icon." },
};

export default async function GettingStarted() {
  const { admin } = await pageAdmin();
  const base = await adminBase();
  if (!admin.welcomed_at) await sql("UPDATE admins SET welcomed_at = now() WHERE email = $1 AND welcomed_at IS NULL", [admin.email]);
  const owner = admin.roles.includes("owner");
  const mine = PAGES.map((p) => ({ ...p, level: p.edit.some((cap) => can(admin, cap)) ? "edit" : can(admin, p.view[0]) ? "view" : "" })).filter((p) => p.level);

  return (
    <>
      <PageHead title="Getting started" lead="A two-minute guide to the House of Retrievers admin." />

      <section className="card">
        <h2>1. Signing in</h2>
        <ul>
          <li>Use <strong>Sign in with Google</strong> with the email you were invited with. No Gmail? Make a free Google account with your own email (Yahoo, Outlook…) at accounts.google.com/signup → “Use your existing email”.</li>
          <li>On a shared or borrowed computer, press <strong>Sign out</strong> (bottom of the menu) when you're done.</li>
        </ul>
      </section>

      <section className="card">
        <h2>2. Your pages</h2>
        <p>The menu on the left shows only the pages you can use. <strong>View</strong> means you can open and read the page; <strong>Edit</strong> means you can also save, send and delete there.{owner ? " As an Owner you have every page, plus Admins & activity log." : " Need another page? Ask an Owner."}</p>
        <div className="guide-pages">
          {mine.map((p) => {
            const how = HOW[p.key];
            return (
              <article key={p.key} className="guide-page">
                <h3><a href={p.path === "/" ? base || "/" : `${base}${p.path}`}>{p.label}</a> <span className={`chip ${p.level === "edit" ? "dark" : ""}`}>{p.level === "edit" ? "Edit" : "View"}</span></h3>
                <p className="small">{how.what}</p>
                <p className="small muted">{p.level === "edit" && how.edit ? how.edit : how.view}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h2>3. Good to know</h2>
        <ul>
          <li>Before anything is saved, sent or deleted, a box asks you to confirm. Read it: it says exactly what will happen.</li>
          <li>Every change is recorded with your name and the time, so mistakes can be traced and fixed. Don't worry about exploring.</li>
          <li>Emails and letters go to real people. Send yourself a test first when you can.</li>
          <li>Never share your sign-in, and don't copy people's details out of the admin.</li>
        </ul>
        <p><a className="btn gold" href={mine[0] ? (mine[0].path === "/" ? base || "/" : `${base}${mine[0].path}`) : base || "/"}>Start with {mine[0]?.label || "the admin"} →</a></p>
      </section>
    </>
  );
}
