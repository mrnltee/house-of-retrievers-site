import MediaHeader from "./MediaHeader";
import LogoMoments from "../components/LogoMoments";
import CopyButton from "./CopyButton";
import PhotoLightbox from "./PhotoLightbox";
import { loadMediaAlbums, loadPublishedMediaContent } from "../lib/mediaHubStore";
import { pressKitFrom } from "../lib/mediaPressKit.mjs";
import { safeRichHtml } from "../lib/safeRichHtml.mjs";
import { DEFAULT_MEDIA_PROFILE, DEFAULT_MEDIA_TIMELINE, cleanMediaProfile, cleanMediaTimeline, cleanTimelineOrientation } from "../lib/mediaHub.mjs";

// Re-rendered hourly so new event albums and photographer credits reach the photo library; a publish in Admin → Media hub refreshes it at once.
export const revalidate = 3600;

export const metadata = {
  title: "Media hub | The House of Retrievers’ Society, Inc.",
  description: "Press resources, organization information, partnership context, and media contact details for The House of Retrievers’ Society, Inc.",
  alternates: { canonical: "https://media.houseofretrieversph.org/" },
  openGraph: {
    title: "Media hub | The House of Retrievers’ Society, Inc.",
    description: "Press resources and partnership information from The House of Retrievers’ Society, Inc.",
    url: "https://media.houseofretrieversph.org/",
    images: [{ url: "/house-of-retrievers-hero-poster.jpg", width: 1280, height: 720, alt: "House of Retrievers families and furbabies together" }],
  },
};

const purposes = [
  ["01", "Purpose to Celebrate", "Gatherings that give back."],
  ["02", "Purpose to Learn", "Responsible pet ownership and community education."],
  ["03", "Purpose to Give Back", "Practical support for rescue organizations."],
  ["04", "Purpose to Care", "Visits that bring comfort and companionship."],
  ["05", "Purpose to Connect", "Friendships across dog communities."],
];

const downloads = [
  { title: "Organization fact sheet", body: "A concise reference for reporters, producers, and partners.", links: [["Download the PDF", "/media/fact-sheet"], ["Read it on this page ↑", "#press-kit"]] },
  { title: "Short and long boilerplates", body: "Descriptions for listings, articles, and introductions, ready to copy.", links: [["Copy them on this page ↑", "#press-kit"]] },
  { title: "Logo and brand assets", body: "The supplied artwork for light and dark backgrounds, with colours and usage rules.", links: [["See the logo files below ↓", "#brand-assets"]] },
  { title: "Photo and video library", body: "Credited photos from past events, with links to our social channels.", links: [["Browse the photos below ↓", "#photo-library"]] },
];

const logoLockups = [
  { title: "Horizontal · on light", note: "Primary lockup. Use for headers, letterheads, press materials and partner decks.", tone: "light", src: "/press/house-of-retrievers-logo-horizontal-light.svg", png: "/house-of-retrievers-logo-original.png" },
  { title: "Horizontal · on dark", note: "Use on black backgrounds. The black retriever and wordmark turn white.", tone: "dark", src: "/press/house-of-retrievers-logo-horizontal-dark.svg", png: "/house-of-retrievers-logo-reverse.png" },
  { title: "Stacked · on light", note: "Use where width is limited: posters, social tiles, signage, merchandise.", tone: "light", src: "/press/house-of-retrievers-logo-stacked-light.svg" },
  { title: "Stacked · on dark", note: "Stacked lockup for black backgrounds.", tone: "dark", src: "/press/house-of-retrievers-logo-stacked-dark.svg" },
];

const brandColors = [
  ["Retriever Gold", "#AD8330", "173 · 131 · 48", "The gold retriever and “Society Inc.”. Accents, rules and large display text."],
  ["Ink", "#0D0D0D", "13 · 13 · 13", "The black retriever. Text and dark backgrounds, instead of pure black."],
  ["Paper", "#FFFFFF", "255 · 255 · 255", "Default light background and reversed text."],
];

const logoRules = [
  ["Clear space", "Keep a margin on every side equal to the height of the “H” in HOUSE. No text, logos or image edges inside it."],
  ["Minimum size", "Horizontal: 180 px or 45 mm wide. Stacked: 120 px or 30 mm wide. Below that the tagline stops being legible."],
  ["Backgrounds", "Light version on white or pale backgrounds, dark version on black. On photos, use a calm light or dark area."],
];

const logoDonts = [
  "Place it on gold or mid-tones. The gold retriever disappears.",
  "Rotate, skew or stretch it.",
  "Fade it or add shadows, glows or outlines.",
  "Recolour the retrievers or the wordmark.",
  "Rearrange or crop the elements, retype the wordmark, or swap the tagline for other text.",
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

const STORY_TITLES = ["Pawres de Mayo", "Care and companionship", "Community collaboration"];

const FALLBACK_CONTENT = {
  heroTitle: "A house with<br><em>a purpose.</em>",
  heroLead: "The media hub for The House of Retrievers’ Society, Inc.—a Philippine nonprofit rooted in the bond between dogs and the people who care for them.",
  about: "We&apos;re furparents who raise our retrievers well—and bring them along to do some good. One paw, one person, and one community at a time.",
  mission: "To bring responsible furparents and furbabies together to support animal rescues, serve communities, and create meaningful memories.",
  stories: "Pawres de Mayo · 17 May 2026 · Parklinks Pet Park · Beneficiary: MBY Pet Rescue and Sanctuary\n\nPurpose to Care visit · Milagros Elderly Home Care and Services\n\nHoR × Beagle Buddies PH Community Pack Walk · 23 August 2026 · Ayala Triangle, Makati",
  partnerships: "Partnerships are shaped around shared objectives—not a fixed price list. Possibilities include an event partnership, a Purpose program partnership, responsible-pet-ownership advocacy, product or in-kind support, educational sessions, venue collaboration, content, and CSR volunteering.",
};

function rich(value) {
  return { __html: safeRichHtml(value).replace(/\n\n/g, "<br><br>") };
}

export default async function MediaPage() {
  const published = await loadPublishedMediaContent();
  const content = { ...FALLBACK_CONTENT, ...published };
  const kit = pressKitFrom(published);
  // One story per line: the editor saves single line breaks, so splitting only on blank lines ran all three together.
  const storyParts = String(content.stories || "").split(/\n+/).map((line) => line.trim()).filter(Boolean).slice(0, 6);
  const albums = await loadMediaAlbums();
  const albumDate = (value) => new Date(value).toLocaleDateString("en-PH", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Manila" });
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
      </section>

      <nav className="media-essentials" aria-label="Press essentials">
        <a href="#launch"><span>Launch · 30 November</span><strong>Golden Beginning</strong><small>Novotel Manila Araneta City</small></a>
        <a href="/media/fact-sheet"><span>Fact sheet</span><strong>Download the PDF</strong><small>Facts, mission, boilerplates</small></a>
        <a href="#brand-assets"><span>Logos</span><strong>Brand assets</strong><small>SVG and PNG, light and dark</small></a>
        <a href="#photo-library"><span>Photos</span><strong>Credited photos</strong><small>From past events</small></a>
        <a href="mailto:houseofretrieversph@gmail.com?subject=Media%20inquiry"><span>Media contact</span><strong>Email us</strong><small>houseofretrieversph@gmail.com</small></a>
      </nav>

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
        <div className="media-purpose-grid">{purposes.map(([number, title, body]) => <article key={number}><h3>{title}</h3><p>{body}</p></article>)}</div>
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
          <div className="media-angle-list">{storyParts.map((text, index) => <article key={text.slice(0, 32)}>{STORY_TITLES[index] ? <h3>{STORY_TITLES[index]}</h3> : null}<p dangerouslySetInnerHTML={rich(text)} /></article>)}</div>
        </div>
        <div className={`media-timeline media-timeline-${timelineOrientation}`} aria-label="Documented activity timeline">
          <div className="media-timeline-heading"><span>Activity history</span></div>
          <div className="media-timeline-list">{timeline.map((item, index) => <article key={`${item.activity}-${index}`}><div className="media-timeline-thumb">{item.thumbnail ? <img src={item.thumbnail} alt={item.activity} /> : <span aria-hidden="true">✦</span>}</div><div className="media-timeline-detail"><time>{item.date}</time><h3>{item.activity}</h3><p>{item.location}</p><small>{item.purpose}</small></div></article>)}</div>
        </div>
      </section>

      <section className="media-partnerships media-chapter" id="partnerships" aria-labelledby="partnerships-title">
          <div className="media-partnerships-copy"><div className="media-section-label media-section-label-light">05 / For partners</div><h2 id="partnerships-title">Build something<br /><em>good with us.</em></h2><p dangerouslySetInnerHTML={rich(content.partnerships)} /><a className="media-button media-button-gold" href="mailto:houseofretrieversph@gmail.com?subject=Partnership%20inquiry">Start a partnership conversation <span aria-hidden="true">↗</span></a></div>
        <div className="media-pathways">{partnershipPathways.map(([title, body], index) => <article key={title}><h3>{title}</h3><p>{body}</p></article>)}<figure className="media-quote"><span aria-hidden="true">“</span><blockquote><p>Raise responsibly.<br />Serve generously.</p></blockquote><figcaption>House of Retrievers</figcaption></figure></div>
      </section>

      <section className="media-section media-press media-chapter" id="press-kit" aria-labelledby="press-title">
        <div className="media-section-label">06 / Press kit</div>
        <div className="media-download-head"><h2 id="press-title">The facts,<br /><em>ready to use.</em></h2><p>Confirmed details for reporters, producers, and partners. Wording marked as a draft is awaiting HOR approval.</p></div>
        <div className="media-press-grid">
          <div>
            <h3 className="media-press-title">Fact sheet</h3>
            <dl className="media-fact-list">
              {kit.factSheet.map(([term, detail]) => <div key={term}><dt>{term}</dt><dd>{detail}</dd></div>)}
              <div><dt>Mission</dt><dd dangerouslySetInnerHTML={rich(content.mission)} /></div>
              <div><dt>Media contact</dt><dd><a href="mailto:houseofretrieversph@gmail.com?subject=Media%20inquiry">houseofretrieversph@gmail.com</a></dd></div>
            </dl>
          </div>
          <div>
            <h3 className="media-press-title">About House of Retrievers</h3>
            {[["Short, about 50 words", kit.boilerplateShort], ["Long, about 150 words", kit.boilerplateLong]].map(([label, text]) => <article className="media-boilerplate" key={label}><header><strong>{label}</strong>{kit.boilerplatesApproved ? null : <span className="media-draft-tag">Draft for approval</span>}<CopyButton text={text} label="Copy text" /></header>{text.split("\n\n").map((paragraph) => <p key={paragraph.slice(0, 24)}>{paragraph}</p>)}</article>)}
            <article className="media-launch-card" id="launch">
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
          <div className="media-angle-grid">{storyAngles.map(([title, body], index) => <article key={title}><h4>{title}</h4><p>{body}</p></article>)}</div>
        </div>
      </section>

      <section className="media-section media-downloads media-chapter" id="downloads" aria-labelledby="downloads-title">
        <div className="media-section-label">07 / Resource library</div><div className="media-download-head"><h2 id="downloads-title">Useful things,<br /><em>in one place.</em></h2><p>The fact sheet, logo files, and credited event photos, ready for editors, producers, and partners.</p></div>
        <div className="media-download-grid">{downloads.map(({ title, body, status, links }) => <article key={title}><h3>{title}</h3><p>{body}</p>{links ? <div className="media-download-links">{links.map(([label, href, file]) => <a key={href + label} href={href} download={file ? true : undefined}>{label}</a>)}</div> : <span className="media-download-status">{status}</span>}</article>)}</div>
        <div className="media-brand-assets" id="brand-assets">
          <h3 className="media-press-title">Logo</h3>
          <p className="media-brand-intro">A gold and a black retriever sitting back to back, the wordmark, the “Society Inc.” line, a paw rule and the tagline. Always use the supplied artwork; never retype or redraw it.</p>
          <div className="media-logo-grid">{logoLockups.map(({ title, note, tone, src, png }) => <figure key={src} className={`media-logo-tile media-logo-tile-${tone}`}><div><img src={src} alt={`The House of Retrievers’ Society, Inc. logo, ${title.toLowerCase().replace(" · ", ", ")}`} loading="lazy" /></div><figcaption><strong>{title}</strong><span>{note}</span><span className="media-download-links"><a href={src} download>Download SVG</a>{png ? <a href={png} download>Download PNG</a> : null}</span></figcaption></figure>)}</div>
          <div className="media-brand-notes">
            <div><strong>Logo colours</strong><ul className="media-swatches">{brandColors.map(([name, hex, rgb, role]) => <li key={hex}><span style={{ background: hex }} aria-hidden="true" /><div><b>{name}</b><code>{hex} · RGB {rgb}</code><small>{role}</small></div></li>)}</ul></div>
            <div><strong>Using the logo</strong><dl className="media-logo-rules">{logoRules.map(([term, detail]) => <div key={term}><dt>{term}</dt><dd>{detail}</dd></div>)}</dl></div>
            <div><strong>Do not</strong><ul className="media-usage">{logoDonts.map((line) => <li key={line}>{line}</li>)}</ul></div>
          </div>
        </div>
        <div className="media-photo-library" id="photo-library">
          <h3 className="media-press-title">Photo and video library</h3>
          <p className="media-brand-intro">Photos from past House of Retrievers activities, credited to the photographers who took them. They are shown here for reference: please email us for high-resolution files and permission before publishing, and keep the photographer’s credit with every photo.</p>
          {albums.length ? albums.map((album) => <section className="media-album" key={album.url} aria-label={`${album.title} photos`}>
            <header><div><h4>{album.title}</h4><p>{albumDate(album.date)}{album.photographers ? ` · Photos by ${album.photographers}` : ""}</p></div><a href={album.url}>See all {album.total} photos <span aria-hidden="true">↗</span></a></header>
            <div className="media-album-grid">{album.photos.map((photo) => <figure key={photo.thumb}><a href={photo.full} data-lightbox={album.url} data-album={album.title} data-caption={`Photo: ${photo.credit}`}><img src={photo.thumb} alt={photo.alt || `${album.title}, House of Retrievers`} loading="lazy" /></a><figcaption>Photo: {photo.credit}</figcaption></figure>)}</div>
          </section>) : <p className="media-photo-empty">Credited event photos will appear here as albums are added to past events and their photographers are recorded.</p>}
          <div className="media-photo-links"><strong>More photos and video</strong><a href="https://www.instagram.com/houseofretrieversph/">Instagram @houseofretrieversph <span aria-hidden="true">↗</span></a><a href="https://www.facebook.com/houseofretrieversph">Facebook /houseofretrieversph <span aria-hidden="true">↗</span></a><a href="mailto:houseofretrieversph@gmail.com?subject=Photo%20request">Request photos or permission <span aria-hidden="true">↗</span></a></div>
        </div>
        <div className="media-editorial-note"><strong>For editors and producers</strong><p>HOR can speak to responsible pet ownership, animal welfare, community care, meaningful interaction with dogs, and partnerships that give community activities a clear purpose. Completed, current, upcoming, and proposed work will always be labelled separately.</p></div>
      </section>

      <PhotoLightbox />
      <footer className="media-footer"><div><LogoMoments tone="dark" /><p>Good dogs. Good people. Greater Good.</p></div><div className="media-footer-contact"><span>Media and partnership inquiries</span><a href="mailto:houseofretrieversph@gmail.com">houseofretrieversph@gmail.com</a></div><div className="media-footer-bottom"><span>© The House of Retrievers’ Society, Inc.</span><a href="https://www.houseofretrieversph.org/">Visit the main site ↗</a></div></footer>
    </main>
  );
}
