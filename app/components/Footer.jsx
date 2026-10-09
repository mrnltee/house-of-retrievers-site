export default function Footer() {
  return (
    <footer>
      <div className="brand footer-brand">
        <picture className="brand-logo-frame">
          <source media="(prefers-color-scheme: dark)" srcSet="/house-of-retrievers-logo-reverse.png" />
          <img className="brand-logo" src="/house-of-retrievers-logo-original.png" alt="House of Retrievers — Paws for a Purpose" width="1396" height="564" loading="lazy" />
        </picture>
      </div>
      <div className="footer-legal">
        <p className="footer-org">The House of Retrievers Society Inc.</p>
        <p>SEC Registration No. 2026090268846-06</p>
        <p suppressHydrationWarning>© {new Date().getFullYear()} All rights reserved.</p>
      </div>
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
