import Link from "next/link";
import LogoMoments from "../components/LogoMoments";

export const metadata = {
  title: "Media hub | The House of Retrievers Society Inc.",
  description: "Press resources, organization information, partnership context, and media contact details for The House of Retrievers Society Inc.",
  alternates: { canonical: "https://media.houseofretrieversph.org/" },
  openGraph: {
    title: "Media hub | The House of Retrievers Society Inc.",
    description: "Press resources and partnership information from The House of Retrievers Society Inc.",
    url: "https://media.houseofretrieversph.org/",
    images: [{ url: "/house-of-retrievers-hero-poster.jpg", width: 1280, height: 720, alt: "House of Retrievers families and furbabies together" }],
  },
};

const purposes = [
  ["01", "Purpose to Celebrate", "Gatherings that give back."],
  ["02", "Purpose to Learn", "Responsible pet ownership and community education."],
  ["03", "Purpose to Give Back", "Practical support for rescue organizations."],
  ["04", "Purpose to Care", "Visits that bring comfort and companionship."],
  ["05", "Purpose to Connect", "A community-wide role documented in HOR materials; final wording pending confirmation."],
];

const downloads = [
  ["Organization fact sheet", "A concise reference for reporters, producers, and partners.", "Coming soon"],
  ["Short and long boilerplates", "Approved descriptions for listings, articles, and introductions.", "Coming soon"],
  ["Logo and brand assets", "Approved artwork and usage notes.", "Coming soon"],
  ["Photo and video library", "Selected, credited media for approved editorial use.", "Coming soon"],
];

export default function MediaPage() {
  return (
    <main className="media-hub">
      <a className="skip-link media-skip" href="#media-content">Skip to content</a>
      <header className="media-header">
        <Link className="media-brand" href="/" aria-label="House of Retrievers home">
          <LogoMoments tone="dark" priority />
        </Link>
        <nav aria-label="Media hub navigation" className="media-nav">
          <a href="#about">About</a>
          <a href="#stories">Stories</a>
          <a href="#partnerships">Partnerships</a>
          <a href="#downloads">Downloads</a>
          <a className="media-nav-contact" href="mailto:houseofretrieversph@gmail.com">Contact media</a>
        </nav>
      </header>

      <section className="media-hero" id="media-content" aria-labelledby="media-title">
        <div className="media-hero-copy">
          <p className="media-kicker">Press · partnerships · stories</p>
          <h1 id="media-title">A house with<br /><em>a purpose.</em></h1>
          <p className="media-lead">The media hub for The House of Retrievers Society Inc.—a Philippine nonprofit rooted in the bond between dogs and the people who care for them.</p>
          <div className="media-actions">
            <a className="media-button media-button-gold" href="mailto:houseofretrieversph@gmail.com?subject=Media%20inquiry">Make a media inquiry <span aria-hidden="true">↗</span></a>
            <a className="media-text-link" href="#downloads">Explore resources <span aria-hidden="true">↓</span></a>
          </div>
        </div>
        <div className="media-hero-note" aria-label="Organization positioning">
          <span>Our advocacy platform</span>
          <strong>Paws for<br />a Purpose</strong>
          <span className="media-hero-note-mark" aria-hidden="true">✦</span>
        </div>
      </section>

      <section className="media-section media-intro media-chapter" id="about" aria-labelledby="about-title">
        <div className="media-section-label">01 / The Society</div>
        <div className="media-intro-grid">
          <h2 id="about-title">Good dogs.<br /><em>Good people.</em><br />Greater good.</h2>
          <div className="media-copy">
            <p>We&apos;re furparents who raise our retrievers well—and bring them along to do some good. One paw, one person, and one community at a time.</p>
            <p>The House of Retrievers Society Inc., formerly known as House of Retrievers PH, is a Philippine SEC-registered nonprofit organization built around the relationship between dogs and the people who love them. The community is rooted in the Golden and Labrador Retriever world and welcomes responsible pet parents of every breed.</p>
            <p className="media-mission"><strong>Our mission</strong> is to bring responsible furparents and furbabies together to support animal rescues, serve communities, and create meaningful memories.</p>
            <p className="media-note">SEC registration number 2026090268846-04 is supplied by HOR and remains subject to final organizational verification before publication.</p>
          </div>
        </div>
      </section>

      <section className="media-purpose media-chapter" aria-labelledby="purpose-title">
        <div className="media-section-label media-section-label-light">02 / Five purpose areas</div>
        <div className="media-purpose-head"><h2 id="purpose-title">The work<br /><em>in five ways.</em></h2><p>Every activity begins with a simple question: how can our community use the bond between dogs and people to do some good?</p></div>
        <div className="media-purpose-grid">{purposes.map(([number, title, body]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
      </section>

      <section className="media-section media-stories media-chapter" id="stories" aria-labelledby="stories-title">
        <div className="media-section-label">03 / For the media</div>
        <div className="media-stories-grid">
          <div><h2 id="stories-title">Stories worth<br /><em>sharing.</em></h2><p>We welcome thoughtful coverage of responsible pet ownership, animal welfare, community service, supportive experiences with dogs, and the people who make this work possible.</p><a className="media-button media-button-dark" href="mailto:houseofretrieversph@gmail.com?subject=Story%20idea%20for%20House%20of%20Retrievers">Share a story idea <span aria-hidden="true">↗</span></a></div>
          <div className="media-angle-list"><article><span>01</span><h3>Pawres de Mayo</h3><p>HOR&apos;s first Purpose to Celebrate, held at Parklinks Pet Park on 17 May 2026, with MBY Pet Rescue and Sanctuary named as beneficiary.</p></article><article><span>02</span><h3>An afternoon of company</h3><p>A Purpose to Care visit to Milagros Elderly Home Care and Services, bringing dogs and people together for a gentle afternoon.</p></article><article><span>03</span><h3>Two communities, one pack</h3><p>The HoR × Beagle Buddies PH Community Pack Walk at Ayala Triangle, Makati, on 23 August 2026.</p></article></div>
        </div>
      </section>

      <section className="media-partnerships media-chapter" id="partnerships" aria-labelledby="partnerships-title">
          <div className="media-partnerships-copy"><div className="media-section-label media-section-label-light">04 / For partners</div><h2 id="partnerships-title">Build something<br /><em>good with us.</em></h2><p>Partnerships are shaped around shared objectives—not a fixed price list. Possibilities include an event partnership, a Purpose program partnership, responsible-pet-ownership advocacy, product or in-kind support, educational sessions, venue collaboration, content, and CSR volunteering.</p><a className="media-button media-button-gold" href="mailto:houseofretrieversph@gmail.com?subject=Partnership%20inquiry">Start a partnership conversation <span aria-hidden="true">↗</span></a></div>
        <div className="media-quote"><span aria-hidden="true">“</span><p>Raise responsibly.<br />Serve generously.</p><small>House of Retrievers</small></div>
      </section>

      <section className="media-section media-downloads media-chapter" id="downloads" aria-labelledby="downloads-title">
        <div className="media-section-label">05 / Resource library</div><div className="media-download-head"><h2 id="downloads-title">Useful things,<br /><em>in one place.</em></h2><p>Approved media materials will be added here as they are finalized and cleared for publication.</p></div>
        <div className="media-download-grid">{downloads.map(([title, body, status]) => <article key={title}><div className="media-download-icon" aria-hidden="true">↘</div><h3>{title}</h3><p>{body}</p><span className="media-download-status">{status}</span></article>)}</div>
        <div className="media-editorial-note"><strong>For editors and producers</strong><p>HOR can speak to responsible pet ownership, animal welfare, community care, meaningful interaction with dogs, and partnerships that give community activities a clear purpose. Completed, current, upcoming, and proposed work will always be labelled separately.</p></div>
      </section>

      <footer className="media-footer"><div><LogoMoments tone="dark" /><p>Good dogs. Good people. Greater Good.</p></div><div className="media-footer-contact"><span>Media and partnership inquiries</span><a href="mailto:houseofretrieversph@gmail.com">houseofretrieversph@gmail.com</a></div><div className="media-footer-bottom"><span>© The House of Retrievers Society Inc.</span><a href="/">Visit the main site ↗</a></div></footer>
    </main>
  );
}
