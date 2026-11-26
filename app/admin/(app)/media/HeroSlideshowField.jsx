"use client";

import HeroSlides from "../../../media/HeroSlides";
import Icon from "../../../components/Icon";
import { DEFAULT_HERO_SLIDESHOW, HERO_FADE, HERO_FOCUS, HERO_MAX_SLIDES, HERO_PHOTO_CHOICES, HERO_SECONDS, heroChoice, heroSlides } from "../../../lib/mediaHeroSlides.mjs";

/**
 * Admin → Media hub → "Top of the page: background slideshow". Picks the photos (from the
 * wide event photos in HERO_PHOTO_CHOICES), their order and crop, how long each shows, how
 * long the crossfade takes and whether they slowly zoom, with a live preview drawn by the
 * public HeroSlides. Posted as JSON in `heroSlideshow`; `cleanHeroSlideshow` checks it again.
 */
export default function HeroSlideshowField({ value, onChange }) {
  const settings = value || DEFAULT_HERO_SLIDESHOW;
  const slides = settings.slides || [];
  const set = (changes) => onChange({ ...settings, ...changes });
  const setSlides = (next) => set({ slides: next });
  const chosen = new Set(slides.map((slide) => slide.src));
  const full = slides.length >= HERO_MAX_SLIDES;
  const move = (index, step) => {
    const next = [...slides];
    const [item] = next.splice(index, 1);
    next.splice(index + step, 0, item);
    setSlides(next);
  };
  const toggle = (src) => setSlides(chosen.has(src) ? slides.filter((slide) => slide.src !== src) : [...slides, { src, focus: "center" }]);
  const preview = heroSlides(settings);
  const shownFor = Math.max(0, settings.seconds - settings.fade).toFixed(1).replace(/\.0$/, "");

  return (
    <div className="hero-ss">
      <label className="switch">
        <input type="checkbox" checked={settings.on} onChange={(event) => set({ on: event.target.checked })} />
        <span><strong>Play a slideshow behind the headline</strong><small>Off: the hero shows the original photo, still. Visitors who turn off motion on their device always see a still photo.</small></span>
      </label>

      <div className="hero-ss-grid" hidden={!settings.on}>
        <div className="hero-ss-main">
          <h3 className="hero-ss-h">Photos in order <span className="muted small">· {slides.length} of {HERO_MAX_SLIDES}</span></h3>
          {slides.length < 2 ? <p className="muted small">Pick at least two photos for a slideshow; one stays still.</p> : null}
          <ol className="hero-ss-list">
            {slides.map((slide, index) => {
              const choice = heroChoice(slide.src);
              return (
                <li key={slide.src}>
                  <img src={slide.src} alt="" style={{ objectPosition: HERO_FOCUS.find((focus) => focus.key === slide.focus)?.position }} />
                  <div className="hero-ss-item">
                    <strong>{index + 1}. {choice?.label || slide.src}</strong>
                    <label className="hero-ss-focus"><span>Keep in view</span>
                      <select value={slide.focus} onChange={(event) => setSlides(slides.map((item, i) => i === index ? { ...item, focus: event.target.value } : item))}>
                        {HERO_FOCUS.map((focus) => <option key={focus.key} value={focus.key}>{focus.label}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="hero-ss-actions">
                    <button type="button" className="hero-ss-move" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move ${choice?.label} earlier`}><Icon name="arrowUp" /></button>
                    <button type="button" className="hero-ss-move" disabled={index === slides.length - 1} onClick={() => move(index, 1)} aria-label={`Move ${choice?.label} later`}><Icon name="arrowDown" /></button>
                    <button type="button" className="linkish danger-text" disabled={slides.length === 1} onClick={() => toggle(slide.src)}>Remove</button>
                  </div>
                </li>
              );
            })}
          </ol>

          <details className="hero-ss-pick">
            <summary>+ Add photos <span className="muted small">· wide photos from HoR's events</span></summary>
            {full ? <p className="muted small">That's {HERO_MAX_SLIDES}, the most a slideshow takes. Remove one to add another.</p> : null}
            <div className="hero-ss-choices">
              {HERO_PHOTO_CHOICES.map((choice) => {
                const on = chosen.has(choice.src);
                return (
                  <button type="button" key={choice.src} className={`hero-ss-choice${on ? " is-on" : ""}`} aria-pressed={on} disabled={!on && full} onClick={() => toggle(choice.src)} title={choice.alt}>
                    <img src={choice.src} alt="" loading="lazy" />
                    <span>{on ? <Icon name="check" /> : null}{choice.label}</span>
                  </button>
                );
              })}
            </div>
          </details>
        </div>

        <div className="hero-ss-side">
          <div className="hero-ss-preview" aria-label="Slideshow preview">
            <HeroSlides key={JSON.stringify(preview) + settings.seconds + settings.fade + settings.zoom} slides={preview} seconds={settings.seconds} fade={settings.fade} zoom={settings.zoom} />
            <p className="hero-ss-preview-title" aria-hidden="true">A house with <em>a purpose.</em></p>
          </div>
          <label className="field">
            <span>Each photo shows for <output>{settings.seconds} s</output></span>
            <input type="range" min={HERO_SECONDS.min} max={HERO_SECONDS.max} step={0.5} value={settings.seconds} onChange={(event) => set({ seconds: Math.max(Number(event.target.value), Math.ceil(settings.fade + 2)) })} />
            <small>Including its crossfade: fully in view for about {shownFor} s.</small>
          </label>
          <label className="field">
            <span>Crossfade <output>{settings.fade} s</output></span>
            <input type="range" min={HERO_FADE.min} max={HERO_FADE.max} step={0.1} value={settings.fade} onChange={(event) => { const fade = Number(event.target.value); set({ fade, seconds: Math.max(settings.seconds, Math.ceil(fade + 2)) }); }} />
            <small>How long one photo takes to dissolve into the next. 1.5–2.5 s reads as a calm crossfade.</small>
          </label>
          <label className="switch">
            <input type="checkbox" checked={settings.zoom} onChange={(event) => set({ zoom: event.target.checked })} />
            <span><strong>Slow zoom</strong><small>Each photo drifts in a little (6%) while it shows.</small></span>
          </label>
          <button type="button" className="linkish small" onClick={() => onChange(DEFAULT_HERO_SLIDESHOW)}>Use the built-in photos and timing</button>
        </div>
      </div>
      <input type="hidden" name="heroSlideshow" value={JSON.stringify(settings)} />
    </div>
  );
}
