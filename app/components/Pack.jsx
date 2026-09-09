import { useState } from "react";
import { families } from "../content/families";
import { joinRoutes } from "../content/join";

export default function Pack({ packView, setPackView, onSupport }) {
  const [flippedFamilies, setFlippedFamilies] = useState(() => ({}));

  const toggleFamilyCard = (group) => {
    setFlippedFamilies((current) => ({ ...current, [group]: !current[group] }));
  };

  const handleTabKey = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const tabs = [...event.currentTarget.parentElement.querySelectorAll('[role="tab"]')];
    const current = tabs.indexOf(event.currentTarget);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    tabs[next].focus();
    tabs[next].click();
  };

  return (
    <section className="pack" id="pack">
      <div className="pack-inner section-shell">
        <div className="pack-heading">
          <div>
            <div className="eyebrow light">Meet the heart of House of Retrievers</div>
            <h2>Every good story<br />starts with a <em>pack.</em></h2>
          </div>
          <div className="view-switch" role="tablist" aria-label="Pack content">
            <button
              id="pack-tab-impact"
              role="tab"
              aria-selected={packView === "impact"}
              aria-controls="pack-panel-impact"
              tabIndex={packView === "impact" ? 0 : -1}
              className={packView === "impact" ? "active" : ""}
              onClick={() => setPackView("impact")}
              onKeyDown={handleTabKey}
            >
              How to join
            </button>
            <button
              id="pack-tab-families"
              role="tab"
              aria-selected={packView === "families"}
              aria-controls="pack-panel-families"
              tabIndex={packView === "families" ? 0 : -1}
              className={packView === "families" ? "active" : ""}
              onClick={() => setPackView("families")}
              onKeyDown={handleTabKey}
            >
              Meet the Founding Pawmilies
            </button>
          </div>
        </div>

        {packView === "impact" ? (
          <div id="pack-panel-impact" role="tabpanel" aria-labelledby="pack-tab-impact" className="join-grid">
            {joinRoutes.map(({ number, title, copy, icon: CardIcon }) => (
              <article key={title} className="join-card">
                <span className="join-number">{number}</span>
                <CardIcon className="join-icon" size={34} strokeWidth={1.4} aria-hidden="true" />
                <div><h3>{title}</h3><p>{copy}</p></div>
              </article>
            ))}
          </div>
        ) : (
          <div id="pack-panel-families" role="tabpanel" aria-labelledby="pack-tab-families" className="family-grid">
            {families.map((family) => {
              if (family.noAvatar) {
                return (
                  <article className={`family-card ${family.tone} no-avatar`} key={family.group}>
                    <small>{family.group}</small>
                    <h3>{family.names}</h3>
                    <p>{family.note}</p>
                  </article>
                );
              }

              const isFlipped = Boolean(flippedFamilies[family.group]);
              return (
                <article
                  className={`family-card family-flip-card ${family.tone}${isFlipped ? " is-flipped" : ""}`}
                  key={family.group}
                  onClick={() => toggleFamilyCard(family.group)}
                  onKeyDown={(event) => {
                    if (event.target.closest("a")) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggleFamilyCard(family.group);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isFlipped}
                  aria-label={`${isFlipped ? "Show details for" : "Show photo for"} ${family.names}`}
                >
                  <span className="family-flip-inner">
                    <span className="family-flip-face family-card-front">
                      <img loading="lazy" decoding="async" className="family-card-image" src={family.frontImage} alt={family.imageAlt} />
                      <span className="family-card-info">
                        <small>{family.group}</small>
                        <strong>{family.names === "Sir Dallas & Mary Jane" ? <>Sir Dallas &<br />Mary Jane</> : family.names}</strong>
                        <a className="family-social" href={family.socialUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>{family.note}</a>
                      </span>
                    </span>
                    <span className="family-flip-face family-card-back" aria-hidden={!isFlipped}>
                      <img loading="lazy" decoding="async" className="family-card-image" src={family.backImage} alt={`${family.names} back photocard`} />
                    </span>
                  </span>
                </article>
              );
            })}
          </div>
        )}

        <div className="pack-support-banner">
          <div><span className="eyebrow light">A little goes a long way</span><h3>Help the pack do more good.</h3><p>Support a community activity through QR, bank transfer, or PayMongo.</p></div>
          <button className="button primary" onClick={onSupport}>Support the pack <span aria-hidden="true">→</span></button>
        </div>

      </div>
    </section>
  );
}
