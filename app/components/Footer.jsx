import LogoMoments from "./LogoMoments";
import FooterLegal from "./FooterLegal";

export default function Footer() {
  return (
    <footer>
      <div className="brand footer-brand">
        <span className="brand-logo-frame">
          <LogoMoments className="brand-logo" tone="auto" />
        </span>
      </div>
      <FooterLegal />
      <div className="social-links" aria-label="Social media links">
        <a className="social-button" href="https://www.facebook.com/houseofretrieversph" target="_blank" rel="noreferrer" aria-label="House of Retrievers on Facebook">
          <span className="social-mark" aria-hidden="true">f</span>
          <span>Facebook</span>
        </a>
        <a className="social-button" href="https://www.instagram.com/houseofretrieversph/" target="_blank" rel="noreferrer" aria-label="House of Retrievers on Instagram">
          <span className="social-mark instagram-mark" aria-hidden="true">ig</span>
          <span>Instagram</span>
        </a>
      </div>
    </footer>
  );
}
