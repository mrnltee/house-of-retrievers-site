"use client";

import { useEffect, useMemo, useState } from "react";
import { HandHeart, Heart, HeartHandshake, Image as ImageIcon, UserRoundPlus, UsersRound } from "lucide-react";

const activities = [
  {
    eyebrow: "Community outreach",
    title: "Paws with purpose",
    copy: "Volunteer-led activities where retriever families show up, lend a paw, and help communities that need support.",
    image:
      "https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=1200&q=85",
    alt: "A happy retriever outdoors with its owner",
  },
  {
    eyebrow: "Responsible ownership",
    title: "Better humans for better dogs",
    copy: "Practical learning, shared experience, and a supportive circle for raising healthy, well-socialized retrievers.",
    image:
      "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=1200&q=85",
    alt: "Golden retriever looking toward the camera",
  },
  {
    eyebrow: "Activities for a cause",
    title: "Every gathering can give back",
    copy: "Joyful pack activities designed to rally support, with proceeds intended for a clearly named beneficiary.",
    image:
      "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=1200&q=85",
    alt: "Retriever enjoying time outside",
  },
];

const families = [
  {
    group: "The Dallas family",
    names: "Sir Dallas & Mary Jane",
    note: "@thegolden.nuggets",
    socialUrl: "https://www.instagram.com/thegolden.nuggets/",
    tone: "cream",
  },
  {
    group: "The Macchi family",
    names: "Macchiato",
    note: "@dailydoseofmacchiato_",
    socialUrl: "https://www.instagram.com/dailydoseofmacchiato_/",
    tone: "gold",
  },
  {
    group: "The Pancake family",
    names: "Faye",
    note: "@itsmefayethepancakee",
    socialUrl: "https://www.instagram.com/itsmefayethepancakee/",
    tone: "sage",
  },
  {
    group: "The LL Bros",
    names: "Luka & Luji",
    note: "@lukaxluji_goldenbros",
    socialUrl: "https://www.instagram.com/lukaxluji_goldenbros/",
    tone: "cream",
  },
  {
    group: "The Bear Duo",
    names: "Molly & Maverick",
    note: "@molly.maverickthebears",
    socialUrl: "https://www.instagram.com/molly.maverickthebears/",
    tone: "gold",
  },
  {
    group: "Growing together",
    names: "More family stories soon",
    note: "Ready for verified sibling and family details",
    tone: "sage",
    noAvatar: true,
  },
];

const Icon = ({ name, size = 20 }) => {
  const paths = {
    arrow: <path d="M5 12h14M14 6l6 6-6 6" />,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5a5.5 5.5 0 0 0 1-8.9Z" />,
    paw: (
      <>
        <ellipse cx="12" cy="15.8" rx="5.2" ry="4.2" />
        <ellipse cx="5.8" cy="10" rx="2.2" ry="2.8" />
        <ellipse cx="10" cy="6.5" rx="2.2" ry="2.8" />
        <ellipse cx="14.8" cy="6.5" rx="2.2" ry="2.8" />
        <ellipse cx="18.5" cy="10.5" rx="2.2" ry="2.8" />
      </>
    ),
    close: <path d="M6 6l12 12M18 6 6 18" />,
    check: <path d="m5 12 4 4L19 6" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
};

export default function Home() {
  const [activeStory, setActiveStory] = useState(0);
  const [packView, setPackView] = useState("impact");
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [interest, setInterest] = useState("Member");
  const [sent, setSent] = useState(false);
  const [progress, setProgress] = useState(0);

  const active = useMemo(() => activities[activeStory], [activeStory]);

  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? (window.scrollY / max) * 100 : 0);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view");
    const story = Number(params.get("story"));
    if (view === "impact" || view === "families") setPackView(view);
    if (Number.isInteger(story) && story >= 0 && story < activities.length) {
      setActiveStory(story);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("view", packView);
    params.set("story", String(activeStory));
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}?${query}${window.location.hash}`);
  }, [packView, activeStory]);

  useEffect(() => {
    if (document.getElementById("juicer-embed-script")) return;
    const script = document.createElement("script");
    script.id = "juicer-embed-script";
    script.src = "https://www.juicer.io/embed/houseofretrieversph/embed-code.js";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }, []);

  const openJoin = () => {
    setSent(false);
    setModalOpen(true);
    setMenuOpen(false);
  };

  const submit = (event) => {
    event.preventDefault();
    setSent(true);
  };

  return (
    <main>
      <a href="#top" className="skip-link">Skip to content</a>
      <div className="scroll-progress" style={{ transform: `scaleX(${progress / 100})` }} />

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
          <button className="nav-cta" onClick={openJoin}>Join the pack <Icon name="arrow" size={16} /></button>
        </nav>
      </header>

      <section className="hero" id="top">
        <video className="hero-photo" autoPlay muted loop playsInline poster="https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=2200&q=90" aria-hidden="true">
          <source src="/house-of-retrievers-hero-1080p.mp4" type="video/mp4" />
        </video>
        <div className="hero-shade" />
        <div className="hero-copy reveal-now">
          <div className="eyebrow light">A community with heart</div>
          <h1>Good dogs.<br />Good people.<br /><em>Greater Good.</em></h1>
          <p>We are responsible retriever families turning companionship into meaningful service<br className="desktop-break" /><br className="mobile-break" />{" "}one paw, one person, and one community at a time.</p>
          <div className="hero-actions">
            <button className="button primary" onClick={openJoin}>Join the pack <Icon name="arrow" /></button>
            <a className="text-link" href="#mission">Discover our purpose <span>↓</span></a>
          </div>
        </div>
        <div className="hero-card">
          <span className="heart-badge"><Heart className="promise-heart" fill="currentColor" /></span>
          <div>
            <small>Our shared promise</small>
            <strong>Raise responsibly.<br />Serve generously.</strong>
          </div>
        </div>
        <div className="scroll-cue"><span>Scroll to meet the pack</span><i /></div>
      </section>

      <section className="mission section-shell" id="mission">
        <div className="section-intro">
          <div className="eyebrow">What moves us</div>
          <h2>More than a breed.<br /><em>A way to give back.</em></h2>
          <p>House of Retrievers brings pet families together around responsible ownership, shared joy, and practical acts of service.</p>
        </div>

        <div className="story-stage">
          <article className="story-image" aria-label={active.alt}>
            {activities.map((item, index) => (
              <div
                key={item.title}
                className={index === activeStory ? "story-image-layer active" : "story-image-layer"}
                style={{ backgroundImage: `linear-gradient(180deg, transparent 45%, rgba(20, 19, 14, .72)), url(${item.image})` }}
              />
            ))}
            <div className="story-caption">
              <span>{String(activeStory + 1).padStart(2, "0")}</span>
              <div><small>{active.eyebrow}</small><strong>{active.title}</strong></div>
            </div>
          </article>
          <div className="story-list">
            {activities.map((item, index) => (
              <button key={item.title} className={index === activeStory ? "story-item active" : "story-item"} onClick={() => setActiveStory(index)}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><strong>{item.title}</strong><p>{item.copy}</p></div>
                <Icon name="arrow" />
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="instagram-section section-shell" id="instagram" aria-labelledby="instagram-title">
        <div className="instagram-heading">
          <div>
            <div className="eyebrow">From the pack</div>
            <h2 id="instagram-title">Life with the <em>retrievers.</em></h2>
          </div>
          <a className="instagram-follow" href="https://www.instagram.com/houseofretrieversph/" target="_blank" rel="noreferrer">
            Follow @houseofretrieversph <Icon name="arrow" size={16} />
          </a>
        </div>
        <div className="juicer-frame">
          <ul className="juicer-feed" data-feed-id="houseofretrieversph">
            <li className="juicer-loading">Loading the latest from Instagram…</li>
          </ul>
        </div>
      </section>

      <section className="pack" id="pack">
        <div className="pack-inner section-shell">
          <div className="pack-heading">
            <div>
              <div className="eyebrow light">Meet the heart of HOR</div>
              <h2>Every good story<br />starts with a <em>pack.</em></h2>
            </div>
            <div className="view-switch" role="tablist" aria-label="Pack content">
              <button
                id="pack-tab-impact"
                role="tab"
                aria-selected={packView === "impact"}
                aria-controls="pack-panel-impact"
                className={packView === "impact" ? "active" : ""}
                onClick={() => setPackView("impact")}
              >
                How to join
              </button>
              <button
                id="pack-tab-families"
                role="tab"
                aria-selected={packView === "families"}
                aria-controls="pack-panel-families"
                className={packView === "families" ? "active" : ""}
                onClick={() => setPackView("families")}
              >
                Founding families
              </button>
            </div>
          </div>

          {packView === "impact" ? (
            <div id="pack-panel-impact" role="tabpanel" aria-labelledby="pack-tab-impact" className="join-grid">
              {[
                ["01", "Become a member", "Meet fellow retriever families, exchange practical care knowledge, and join community activities.", UsersRound],
                ["02", "Volunteer together", "Bring your time, skills, or friendly retriever to outreach programs where your presence can help.", HandHeart],
                ["03", "Partner for a cause", "Collaborate on a transparent, beneficiary-led activity that turns a gathering into meaningful support.", HeartHandshake],
              ].map(([number, title, copy, CardIcon]) => (
                <article key={title} className="join-card">
                  <span className="join-number">{number}</span>
                  <CardIcon className="join-icon" size={34} strokeWidth={1.4} aria-hidden="true" />
                  <div><h3>{title}</h3><p>{copy}</p></div>
                </article>
              ))}
            </div>
          ) : (
            <div id="pack-panel-families" role="tabpanel" aria-labelledby="pack-tab-families" className="family-grid">
              {families.map((family) => (
                <article className={`family-card ${family.tone}${family.noAvatar ? " no-avatar" : ""}`} key={family.group}>
                  {!family.noAvatar && <div className="family-avatar" aria-label="Family image placeholder"><ImageIcon size={24} strokeWidth={1.4} aria-hidden="true" /></div>}
                  <small>{family.group}</small>
                  <h3>{family.names === "Sir Dallas & Mary Jane" ? <>Sir Dallas &<br />Mary Jane</> : family.names}</h3>
                  <p>{family.socialUrl ? <a className="family-social" href={family.socialUrl} target="_blank" rel="noreferrer">{family.note}</a> : family.note}</p>
                </article>
              ))}
            </div>
          )}

          <div className="final-cta">
            <div><span className="mini-mark"><UserRoundPlus size={22} strokeWidth={1.5} aria-hidden="true" /></span><p>There is always room<br />for one more good human.</p></div>
            <button className="button cream" onClick={openJoin}>Come join us <Icon name="arrow" /></button>
          </div>
        </div>
      </section>

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

      {modalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setModalOpen(false)}>
          <section className="join-modal" role="dialog" aria-modal="true" aria-labelledby="join-title">
            <button className="modal-close" onClick={() => setModalOpen(false)} aria-label="Close form"><Icon name="close" /></button>
            {!sent ? (
              <>
                <div className="eyebrow">Your first step</div>
                <h2 id="join-title">How would you like<br />to join the pack?</h2>
                <p className="modal-lead">Choose what fits you today. You can always explore the others later.</p>
                <div className="interest-grid">
                  {["Member", "Volunteer", "Partner"].map((item) => (
                    <button key={item} className={interest === item ? "active" : ""} onClick={() => setInterest(item)}>
                      <span><Icon name={interest === item ? "check" : "paw"} size={17} /></span>{item}
                    </button>
                  ))}
                </div>
                <form onSubmit={submit}>
                  <label>Name<input required name="name" autoComplete="name" placeholder="e.g. Jane Doe" /></label>
                  <label>Email<input required type="email" name="email" autoComplete="email" spellCheck={false} placeholder="e.g. jane@email.com" /></label>
                  <label>Tell us about your retriever or interest<textarea name="message" placeholder="A short hello is perfect" rows="3" /></label>
                  <button className="button dark" type="submit">Continue as {interest} <Icon name="arrow" /></button>
                  <small className="prototype-note">Prototype only—submissions are not sent yet.</small>
                </form>
              </>
            ) : (
              <div className="success-state">
                <span><Icon name="check" size={34} /></span>
                <div className="eyebrow">Preview complete</div>
                <h2>Your interest flow works.</h2>
                <p>This is where the live website will confirm the request and guide the visitor to the next step.</p>
                <button className="button dark" onClick={() => setModalOpen(false)}>Back to the site <Icon name="arrow" /></button>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
