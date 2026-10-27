import { adminBase, pageAdmin } from "../../../lib/admin/guard";
import { PageHead } from "../ui";
import { StartGuideButton } from "../GuideTour";
import { HOW, guidePages } from "../../../lib/admin/guide.mjs";

/**
 * Getting started (owner, 2026-10-27): a short guide for first-time admins,
 * showing only the pages this person can use and whether they can change
 * things there. Opening it once hides the welcome box.
 */

export default async function GettingStarted() {
  const { admin } = await pageAdmin();
  const base = await adminBase();
    const owner = admin.roles.includes("owner");
  const mine = guidePages(admin);

  return (
    <>
      <PageHead title="Getting started" lead="A two-minute guide to the House of Retrievers admin."><StartGuideButton /></PageHead>

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
