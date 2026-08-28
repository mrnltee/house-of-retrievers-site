import Icon from "./Icon";

export default function Header({ menuOpen, setMenuOpen, onJoin }) {
  return (
    <header className="site-header">
      <a href="#top" className="brand" aria-label="House of Retrievers home">
        <span className="brand-logo-frame">
          <img className="brand-logo" src="/house-of-retrievers-logo-reverse.png" alt="House of Retrievers — Paws for a Purpose" width="1396" height="564" fetchPriority="high" />
        </span>
      </a>

      <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation" aria-expanded={menuOpen}>
        <Icon name={menuOpen ? "close" : "menu"} />
      </button>

      <nav className={menuOpen ? "nav open" : "nav"} aria-label="Primary navigation">
        <a href="#mission" onClick={() => setMenuOpen(false)}>Our purpose</a>
        <a href="#pack" onClick={() => setMenuOpen(false)}>The pack</a>
        <button className="nav-cta" onClick={onJoin}>Join the pack <Icon name="arrow" size={16} /></button>
      </nav>
    </header>
  );
}
