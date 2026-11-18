import { adminBase, pageAdmin } from "../../../lib/admin/guard";
import { PageHead } from "../ui";
import { yahooReady } from "../../../lib/admin/auth";
import { StartGuideButton } from "../GuideTour";
import WelcomeFilm from "../WelcomeFilm";
import { HOW, guidePages } from "../../../lib/admin/guide.mjs";
import Icon from "../../../components/Icon";

/**
 * Getting started (owner, 2026-10-27; design review 18 Nov 2026): the welcome film first, then this person's
 * pages in menu order with their menu section (each card opens its page; only View-only pages are marked), then the few things
 * worth knowing, and signing in and out last (they're already signed in when they read this).
 */

const GROUPS = ["Run", "Publish", "Money", "Settings"];

export default async function GettingStarted() {
  const { admin } = await pageAdmin();
  const base = await adminBase();
  const owner = admin.roles.includes("owner");
  const mine = guidePages(admin);
  const href = (p) => (p.path === "/" ? base || "/" : `${base}${p.path}`);
  const viewOnly = mine.filter((p) => p.level === "view").length;

  return (
    <>
      <PageHead title="Getting started" lead="Everything a new admin needs, in about two minutes." />

      <section className="card gs-hero" aria-labelledby="gs-film">
        <div className="gs-hero-art" aria-hidden="true">
          <span className="gs-hero-play"><Icon name="play" /></span>
          <span className="gs-hero-time">30 s</span>
        </div>
        <div className="gs-hero-copy">
          <p className="gs-kicker">Start here</p>
          <h2 id="gs-film">See an event from start to finish</h2>
          <p className="muted">Create it, take RSVPs, check a payment and welcome guests at the door, in a 30-second film. Then let the menu tour point out where everything is.</p>
          <div className="actions">
            <WelcomeFilm label="Watch the tour" className="btn gold" />
            <StartGuideButton className="btn ghost" label="Show me around the menu" />
          </div>
        </div>
      </section>

      <section className="card" aria-labelledby="gs-pages">
        <h2 id="gs-pages">Your pages</h2>
        <p className="muted">
          The menu shows only these.{" "}
          {viewOnly === 0 ? "You can change things on all of them." : viewOnly === mine.length ? "You can open and read them; ask an Owner if you need to change something." : "You can change things on all of them except those marked View only."}
          {owner ? " As an Owner you also have Admins & activity log." : ""}
        </p>
        <div className="guide-pages">
          {GROUPS.flatMap((group) => mine.filter((p) => p.group === group)).map((p) => {
            const how = HOW[p.key];
            const howLine = p.level === "edit" && how.edit ? how.edit : how.view;
            return (
              <a key={p.key} className="guide-page" href={href(p)}>
                <span className="guide-page-group">{p.group}</span>
                <span className="guide-page-head">
                  <strong>{p.label}</strong>
                  {p.level === "view" && <span className="chip">View only</span>}
                  <Icon name="arrow" />
                </span>
                <span className="guide-page-what">{how.what}</span>
                {howLine && howLine !== "Read only." && <span className="guide-page-how">{howLine}</span>}
                {how.guide && p.level === "edit" && <span className="guide-page-tip"><Icon name="play" /> Has How it works guides</span>}
              </a>
            );
          })}
        </div>
      </section>

      <section className="card" aria-labelledby="gs-know">
        <h2 id="gs-know">Good to know</h2>
        <ul className="gs-know">
          <li><strong>Nothing happens without a yes.</strong> Before anything is saved, sent or deleted, a box says exactly what will happen and asks you to confirm.</li>
          <li><strong>Exploring is safe.</strong> Every change is recorded with your name and the time, so mistakes can be traced and fixed.</li>
          <li><strong>Emails go to real people.</strong> Send yourself a test first when you can.</li>
          <li><strong>Stuck on a page?</strong> Look for <strong>How it works</strong> at the top: a short film of the steps.</li>
          <li><strong>Keep details private.</strong> Never share your sign-in, and don't copy people's details out of the admin.</li>
          <li><strong>On a shared computer,</strong> press <strong>Sign out</strong> at the bottom of the menu when you're done.</li>
        </ul>
      </section>

      <section className="card gs-signin" aria-labelledby="gs-signin">
        <h2 id="gs-signin">Signing in next time</h2>
        <p className="muted">
          {yahooReady
            ? <>Use <strong>Sign in with Google</strong> or <strong>Sign in with Yahoo</strong>, with the email you were invited with. Another email, such as Outlook? Make a free Google account with it at accounts.google.com/signup, then choose “Use your existing email”.</>
            : <>Use <strong>Sign in with Google</strong> with the email you were invited with. No Gmail? Make a free Google account with your own email (Yahoo, Outlook…) at accounts.google.com/signup, then choose “Use your existing email”.</>}
        </p>
      </section>
    </>
  );
}
