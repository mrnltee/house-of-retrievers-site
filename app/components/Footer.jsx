export default function Footer() {
  return (
    <footer>
      <div className="brand footer-brand"><span className="brand-logo-frame"><img className="brand-logo" src="/house-of-retrievers-logo-original.png" alt="House of Retrievers — Paws for a Purpose" width="1396" height="564" loading="lazy" /></span></div>
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
