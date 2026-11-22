import Footer from "./components/Footer";
import LogoMoments from "./components/LogoMoments";
import Icon from "./components/Icon";
import { HOME_URL } from "./lib/siteSeo.mjs";
import { EVENTS_URL } from "./lib/eventsHost.mjs";

export const metadata = {
  title: "Page not found | House of Retrievers PH",
  robots: { index: false },
};

/**
 * Branded "not found" for every host (audit, 22 Nov 2026): a mistyped or old
 * link from Instagram used to land on a bare black 404 with no way forward.
 * Links are absolute so they work on www, events and media alike.
 */
export default function NotFound() {
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="privacy-header">
        <a className="privacy-brand" href={HOME_URL} aria-label="House of Retrievers home">
          <LogoMoments tone="light" />
        </a>
        <a className="privacy-home" href={HOME_URL}>Back to the main site</a>
      </header>
      <main id="main" tabIndex={-1} className="privacy-page not-found-page">
        <div className="privacy-intro">
          <p className="eyebrow">Page not found</p>
          <h1>This trail went cold.</h1>
          <p>The link may be old or mistyped. Our events and the pack are a tap away.</p>
          <div className="not-found-actions">
            <a className="button primary" href={EVENTS_URL}>See upcoming events <Icon name="arrow" size={16} /></a>
            <a className="button events-button-outline" href={HOME_URL}>Go to the home page</a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
