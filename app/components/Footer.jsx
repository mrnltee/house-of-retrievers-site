import LogoMoments from "./LogoMoments";
import FooterLegal from "./FooterLegal";
import Icon from "./Icon";

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
        <a className="social-button" href="https://www.facebook.com/houseofretrieversph" target="_blank" rel="noreferrer" aria-label="House of Retrievers on Facebook (opens in a new tab)">
          <span>Facebook</span>
          <Icon name="external" />
        </a>
        <a className="social-button" href="https://www.instagram.com/houseofretrieversph/" target="_blank" rel="noreferrer" aria-label="House of Retrievers on Instagram (opens in a new tab)">
          <span>Instagram</span>
          <Icon name="external" />
        </a>
      </div>
    </footer>
  );
}
