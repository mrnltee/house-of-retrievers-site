import MediaHeader from "./MediaHeader";
import LogoMoments from "../components/LogoMoments";
import { hasDatabase, sql } from "../lib/db";
import { safeRichHtml } from "../lib/safeRichHtml.mjs";
import { DEFAULT_MEDIA_PROFILE, DEFAULT_MEDIA_TIMELINE, cleanMediaProfile, cleanMediaTimeline, cleanTimelineOrientation } from "../lib/mediaHub.mjs";

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
  { title: "Organization fact sheet", body: "A concise reference for reporters, producers, and partners.", links: [["Read it on this page ↑", "#press-kit"]] },
  { title: "Short and long boilerplates", body: "Descriptions for listings, articles, and introductions. Draft wording, awaiting HOR approval.", links: [["Read them on this page ↑", "#press-kit"]] },
  { title: "Logo and brand assets", body: "The supplied artwork for light and dark backgrounds.", links: [
    ["Horizontal, light (SVG)", "/press/house-of-retrievers-logo-horizontal-light.svg", true],
    ["Horizontal, dark (SVG)", "/press/house-of-retrievers-logo-horizontal-dark.svg", true],
    ["Stacked, light (SVG)", "/press/house-of-retrievers-logo-stacked-light.svg", true],
    ["Stacked, dark (SVG)", "/press/house-of-retrievers-logo-stacked-dark.svg", true],
    ["Horizontal, light (PNG)", "/house-of-retrievers-logo-original.png", true],
    ["Horizontal, dark (PNG)", "/house-of-retrievers-logo-reverse.png", true],
  ] },
  { title: "Photo and video library", body: "Selected, credited media for approved editorial use.", status: "Coming soon" },
];

const brandColors = [
  ["Retriever gold", "#AD8330"],
  ["Ink", "#0D0D0D"],
  ["White", "#FFFFFF"],
];

const logoUsage = [
  "Use the light version on white or pale backgrounds and the dark version on black.",
  "Keep clear space around the logo equal to the height of the “H” in HOUSE.",
  "Do not recolour, stretch, rotate, crop, or rearrange it, and do not retype the wordmark.",
  "Avoid gold or busy photo backgrounds, where the golden retriever disappears.",
];

const factSheet = [
  ["Legal name", "The House of Retrievers Society Inc."],
  ["Also known as", "House of Retrievers, HoR. Formerly House of Retrievers PH."],
  ["What it is", "A Philippine nonprofit, registered with the SEC in September 2026."],
  ["SEC registration", "No. 2026090268846-04"],
  ["Advocacy platform", "Paws for a Purpose"],
  ["Purpose areas", "Celebrate · Learn · Give Back · Care · Connect"],
  ["Who can join", "Pet parents of every breed, and volunteers with or without a dog."],
  ["First fundraiser", "Pawres de Mayo, 17 May 2026, for MBY Pet Rescue and Sanctuary."],
  ["Official launch", "Golden Beginning: Paws and Purpose, 30 November 2026, Novotel Manila Araneta City, Quezon City."],
  ["Online", "houseofretrieversph.org · Facebook and Instagram @houseofretrieversph"],
];

const boilerplates = [
  ["Short, about 50 words", "The House of Retrievers Society Inc. is an SEC-registered nonprofit in the Philippines that brings responsible pet parents and their dogs together to do good. Through five purpose areas (Celebrate, Learn, Give Back, Care, and Connect), HoR supports rescues and communities, naming every beneficiary up front. Paws for a Purpose."],
  ["Long, about 150 words", "The House of Retrievers Society Inc. (HoR) began when retriever families met through a group chat to plan a doggie run. That gathering became Pawres de Mayo in May 2026, a celebration that supported MBY Pet Rescue and Sanctuary and published a breakdown of what was turned over. By September 2026, HoR was registered with the SEC as a nonprofit.\n\nToday HoR welcomes pet parents of every breed and volunteers with or without dogs. Its work runs through five purpose areas: Celebrate, Learn, Give Back, Care, and Connect. Activities have included free hugs events in BGC, a creative workshop with Pawfect Blooms, a visit to elderly residents at Milagros Elderly Home Care and Services, and a pack walk with Beagle Buddies PH. Every activity names its beneficiary before it starts. HoR’s promise: Raise responsibly. Serve generously. HoR launches publicly on 30 November 2026 at Novotel Manila Araneta City."],
];

const storyAngles = [
  ["From group chat to nonprofit", "How retriever families went from a first fundraiser in May to a registered society in September 2026."],
  ["Name it first", "A volunteer pet community that names its beneficiary before each event and publishes what was turned over."],
  ["Comfort, not therapy", "What happens when well-raised dogs visit elderly residents, planned with care staff."],
  ["No dog needed", "Why people without pets are joining a dog community."],
  ["Two communities, one pack", "Dog groups working together instead of competing, as in the pack walk with Beagle Buddies PH."],
  ["Pet parenting as civic duty", "Responsible ownership and community service in the same sentence."],
];

const partnershipPathways = [
  ["Event partnerships", "Create a gathering with a clear community purpose."],
  ["Purpose programs", "Support a focused activity under the Paws for a Purpose platform."],
  ["Advocacy and education", "Help make responsible pet ownership easier to understand and practise."],
  ["Product or in-kind support", "Contribute useful goods or services where there is a clear need."],
  ["Venue, content, and CSR", "Open a space, tell a thoughtful story, or bring a team to volunteer."],
];

const FALLBACK_CONTENT = {
  heroTitle: "A house with<br><em>a purpose.</em>",
  heroLead: "The media hub for The House of Retrievers Society Inc.—a Philippine nonprofit rooted in the bond between dogs and the people who care for them.",
  about: "We&apos;re furparents who raise our retrievers well—and bring them along to do some good. One paw, one person, and one community at a time.",
  mission: "To bring responsible furparents and furbabies together to support animal rescues, serve communities, and create meaningful memories.",
  stories: "Pawres de Mayo · 17 May 2026 · Parklinks Pet Park · Beneficiary: MBY Pet Rescue and Sanctuary\n\nPurpose to Care visit · Milagros Elderly Home Care and Services\n\nHoR × Beagle Buddies PH Community Pack Walk · 23 August 2026 · Ayala Triangle, Makati",
  partnerships: "Partnerships are shaped around shared objectives—not a fixed price list. Possibilities include an event partnership, a Purpose program partnership, responsible-pet-ownership advocacy, product or in-kind support, educational sessions, venue collaboration, content, and CSR volunteering.",
};

function rich(value) {
  return { __html: safeRichHtml(value).replace(/\n\n/g, "<br><br>") };
}

export default async function MediaPage() {
  let content = FALLBACK_CONTENT;
  if (hasDatabase()) {
    const [document] = await sql("SELECT content FROM media_hub_documents WHERE id=true AND status='published'");
    if (document?.content && Object.keys(document.content).length) content = { ...content, ...document.content };
  }
  const timeline = Array.isArray(content.timeline) ? cleanMediaTimeline(content.timeline) : DEFAULT_MEDIA_TIMELINE;
  const timelineOrientation = cleanTimelineOrientation(content.timelineOrientation);
  const profile = cleanMediaProfile(content.profile || DEFAULT_MEDIA_PROFILE);
  return (
    <main className="media-hub">
      <a className="skip-link media-skip" href="#media-content">Skip to content</a>
      <MediaHeader />

      <section className="media-hero" id="media-content" aria-labelledby="media-title">
        <div className="media-hero-copy">
          <p className="media-kicker">Press · partnerships · stories</p>
          <h1 id="media-title" dangerouslySetInnerHTML={rich(content.heroTitle)} />
          <p className="media-lead" dangerouslySetInnerHTML={rich(content.heroLead)} />
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
            <div dangerouslySetInnerHTML={rich(content.about)} />
            <p className="media-mission"><strong>Our mission</strong> <span dangerouslySetInnerHTML={rich(content.mission)} /></p>
            <p className="media-note">SEC registration number 2026090268846-04.</p>
          </div>
        </div>
      </section>

      <section className="media-purpose media-chapter" aria-labelledby="purpose-title">
        <div className="media-section-label media-section-label-light">02 / Five purpose areas</div>
        <div className="media-purpose-head"><h2 id="purpose-title">The work<br /><em>in five ways.</em></h2><p>Every activity begins with a simple question: how can our community use the bond between dogs and people to do some good?</p></div>
        <div className="media-purpose-grid">{purposes.map(([number, title, body]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
      </section>

      <section className="media-section media-profile media-chapter" aria-labelledby="profile-title">
        <div className="media-section-label">03 / The profile</div>
        <div className="media-profile-head">
          <div><h2 id="profile-title">{profile.title}</h2><p>{profile.intro}</p></div>
          <div className="media-proof-grid">{profile.cards.map((card, index) => <article key={`${card.label}-${index}`}><strong>{card.value}</strong><span>{card.label}</span><p>{card.note}</p></article>)}</div>
        </div>
        <div className="media-snapshot" aria-label="Selected House of Retrievers image moments">
          {profile.images.map((image, index) => <figure key={`${image.src}-${index}`}><img src={image.src} alt={image.alt} /><figcaption>{image.caption}</figcaption></figure>)}
        </div>
      </section>

      <section className="media-section media-stories media-chapter" id="stories" aria-labelledby="stories-title">
        <div className="media-section-label">04 / For the media</div>
        <div className="media-stories-grid">
          <div><h2 id="stories-title">Stories worth<br /><em>sharing.</em></h2><p>We welcome thoughtful coverage of responsible pet ownership, animal welfare, community service, supportive experiences with dogs, and the people who make this work possible.</p><a className="media-button media-button-dark" href="mailto:houseofretrieversph@gmail.com?subject=Story%20idea%20for%20House%20of%20Retrievers">Share a story idea <span aria-hidden="true">↗</span></a></div>
          <div className="media-angle-list"><article><span>01</span><h3>Pawres de Mayo</h3><p dangerouslySetInnerHTML={rich(content.stories.split("\n\n")[0])} /></article><article><span>02</span><h3>Care and companionship</h3><p dangerouslySetInnerHTML={rich(content.stories.split("\n\n")[1] || "")} /></article><article><span>03</span><h3>Community collaboration</h3><p dangerouslySetInnerHTML={rich(content.stories.split("\n\n")[2] || "")} /></article></div>
        </div>
        <div className={`media-timeline media-timeline-${timelineOrientation}`} aria-label="Documented activity timeline">
          <div className="media-timeline-heading"><span>Activity history</span><p>Completed activities are listed separately from upcoming or proposed work.</p></div>
          <div className="media-timeline-list">{timeline.map((item, index) => <article key={`${item.activity}-${index}`}><div className="media-timeline-thumb">{item.thumbnail ? <img src={item.thumbnail} alt="" /> : <span aria-hidden="true">✦</span>}</div><div className="media-timeline-detail"><time>{item.date}</time><h3>{item.activity}</h3><p>{item.location}</p><small>{item.purpose}</small></div></article>)}</div>
        </div>
      </section>

      <section className="media-partnerships media-chapter" id="partnerships" aria-labelledby="partnerships-title">
          <div className="media-partnerships-copy"><div className="media-section-label media-section-label-light">05 / For partners</div><h2 id="partnerships-title">Build something<br /><em>good with us.</em></h2><p dangerouslySetInnerHTML={rich(content.partnerships)} /><a className="media-button media-button-gold" href="mailto:houseofretrieversph@gmail.com?subject=Partnership%20inquiry">Start a partnership conversation <span aria-hidden="true">↗</span></a></div>
        <div className="media-pathways">{partnershipPathways.map(([title, body], index) => <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
        <div className="media-quote"><span aria-hidden="true">“</span><p>Raise responsibly.<br />Serve generously.</p><small>House of Retrievers</small></div>
      </section>

      <section className="media-section media-press media-chapter" id="press-kit" aria-labelledby="press-title">
        <div className="media-section-label">06 / Press kit</div>
        <div className="media-download-head"><h2 id="press-title">The facts,<br /><em>ready to use.</em></h2><p>Confirmed details for reporters, producers, and partners. Wording marked as a draft is awaiting HOR approval.</p></div>
        <div className="media-press-grid">
          <div>
            <h3 className="media-press-title">Fact sheet</h3>
            <dl className="media-fact-list">
              {factSheet.map(([term, detail]) => <div key={term}><dt>{term}</dt><dd>{detail}</dd></div>)}
              <div><dt>Mission</dt><dd dangerouslySetInnerHTML={rich(content.mission)} /></div>
              <div><dt>Media contact</dt><dd><a href="mailto:houseofretrieversph@gmail.com?subject=Media%20inquiry">houseofretrieversph@gmail.com</a></dd></div>
            </dl>
          </div>
          <div>
            <h3 className="media-press-title">About House of Retrievers</h3>
            {boilerplates.map(([label, text]) => <article className="media-boilerplate" key={label}><header><strong>{label}</strong><span className="media-draft-tag">Draft for approval</span></header>{text.split("\n\n").map((paragraph) => <p key={paragraph.slice(0, 24)}>{paragraph}</p>)}</article>)}
            <article className="media-launch-card">
              <span>Official launch · 30 November 2026</span>
              <h3>Golden Beginning:<br /><em>Paws and Purpose</em></h3>
              <p>Monday, 2:30 to 6:00 PM, at Novotel Manila Araneta City, Quezon City. For the benefit of Pawssion Project Foundation Inc. and the Little Sisters of the Abandoned Elderly.</p>
              <div className="media-actions">
                <a className="media-button media-button-gold" href="mailto:houseofretrieversph@gmail.com?subject=Media%20access%3A%20Golden%20Beginning">Ask about media access <span aria-hidden="true">↗</span></a>
                <a className="media-text-link" href="https://events.houseofretrieversph.org/golden-beginning-paws-and-purpose-2026-11">Event details <span aria-hidden="true">↗</span></a>
              </div>
            </article>
          </div>
        </div>
        <div className="media-press-angles">
          <h3 className="media-press-title">Story angles</h3>
          <div className="media-angle-grid">{storyAngles.map(([title, body], index) => <article key={title}><span>0{index + 1}</span><h4>{title}</h4><p>{body}</p></article>)}</div>
        </div>
      </section>

      <section className="media-section media-downloads media-chapter" id="downloads" aria-labelledby="downloads-title">
        <div className="media-section-label">07 / Resource library</div><div className="media-download-head"><h2 id="downloads-title">Useful things,<br /><em>in one place.</em></h2><p>Logo files are ready to download. The photo and video library will be added once images are selected, credited, and cleared for publication.</p></div>
        <div className="media-download-grid">{downloads.map(({ title, body, status, links }) => <article key={title}><div className="media-download-icon" aria-hidden="true">↘</div><h3>{title}</h3><p>{body}</p>{links ? <div className="media-download-links">{links.map(([label, href, file]) => <a key={href + label} href={href} download={file ? true : undefined}>{label}</a>)}</div> : <span className="media-download-status">{status}</span>}</article>)}</div>
        <div className="media-brand-notes">
          <div><strong>Logo colours</strong><ul className="media-swatches">{brandColors.map(([name, hex]) => <li key={hex}><span style={{ background: hex }} aria-hidden="true" /><b>{name}</b><code>{hex}</code></li>)}</ul></div>
          <div><strong>Using the logo</strong><ul className="media-usage">{logoUsage.map((line) => <li key={line}>{line}</li>)}</ul></div>
        </div>
        <div className="media-editorial-note"><strong>For editors and producers</strong><p>HOR can speak to responsible pet ownership, animal welfare, community care, meaningful interaction with dogs, and partnerships that give community activities a clear purpose. Completed, current, upcoming, and proposed work will always be labelled separately.</p></div>
      </section>

      <footer className="media-footer"><div><LogoMoments tone="dark" /><p>Good dogs. Good people. Greater Good.</p></div><div className="media-footer-contact"><span>Media and partnership inquiries</span><a href="mailto:houseofretrieversph@gmail.com">houseofretrieversph@gmail.com</a></div><div className="media-footer-bottom"><span>© The House of Retrievers Society Inc.</span><a href="https://www.houseofretrieversph.org/">Visit the main site ↗</a></div></footer>
    </main>
  );
}
