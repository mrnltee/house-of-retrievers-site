import Footer from "../components/Footer";
import LogoMoments from "../components/LogoMoments";
import { HOME_URL, PRIVACY_URL, SITE_NAME } from "../lib/siteSeo.mjs";

const TITLE = `Privacy notice | ${SITE_NAME}`;
const DESCRIPTION = "How House of Retrievers uses and protects information shared through its join, event and payment forms.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PRIVACY_URL },
  openGraph: {
    type: "website",
    url: PRIVACY_URL,
    title: TITLE,
    description: DESCRIPTION,
    siteName: SITE_NAME,
    locale: "en_PH",
  },
};

export default function PrivacyPage() {
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="privacy-header">
        <a className="privacy-brand" href={HOME_URL} aria-label="House of Retrievers home">
          <LogoMoments tone="light" />
        </a>
        <a className="privacy-home" href={HOME_URL}>Back to the main site</a>
      </header>

      <main id="main" tabIndex={-1} className="privacy-page">
        <div className="privacy-intro">
          <p className="eyebrow">Your privacy</p>
          <h1>Privacy notice</h1>
          <p>House of Retrievers collects only the information we need to respond to join requests, organise events, confirm payments, issue passes, and keep our community records accurate.</p>
        </div>

        <div className="privacy-sections">
          <section aria-labelledby="privacy-collect">
            <h2 id="privacy-collect">What we collect</h2>
            <p>Depending on what you choose to do, this may include your name, email address, social profile, organization, furbaby details or photo, event registration details, photo preference, guardian&apos;s name, and payment reference or receipt.</p>
          </section>

          <section aria-labelledby="privacy-protect">
            <h2 id="privacy-protect">How we use and protect it</h2>
            <p>We keep this information confidential. Access is limited to authorised House of Retrievers admins and the trusted services used to run our forms, email, file storage, payments, and events. We do not publish your contact details, payment details, private photos, or receipts.</p>
          </section>

          <section aria-labelledby="privacy-photos">
            <h2 id="privacy-photos">Your photo choice</h2>
            <p>If you allow event photos, they may appear on House of Retrievers&apos; website or social pages. If you choose “No photos of me,” we will respect that choice.</p>
          </section>

          <section aria-labelledby="privacy-ask">
            <h2 id="privacy-ask">Ask us about your information</h2>
            <p>You can ask us to review, correct, or remove information you shared with us by messaging House of Retrievers through our official <a href="https://www.instagram.com/houseofretrieversph/" target="_blank" rel="noreferrer">Instagram</a> or <a href="https://www.facebook.com/houseofretrieversph" target="_blank" rel="noreferrer">Facebook</a> account.</p>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
