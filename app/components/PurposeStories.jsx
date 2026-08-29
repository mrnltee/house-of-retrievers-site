import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { activities } from "../content/activities";

/** Above this many photos the dots stop fitting the control pill on a phone. */
const MAX_DOTS = 6;

function StoryMedia({ item }) {
  const [slide, setSlide] = useState(0);
  const gallery = item.gallery;
  const activeSlide = gallery ? slide % gallery.length : 0;

  useEffect(() => {
    if (!gallery || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setSlide((current) => (current + 1) % gallery.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [gallery]);

  return (
    <div className="pillar-media">
      {gallery ? (
        <div className="story-carousel" role="region" aria-roledescription="carousel" aria-label={`${item.title} photos`}>
          {gallery.map((photo, index) => (
            <img
              key={photo.src}
              className={index === activeSlide ? "story-carousel-slide active" : "story-carousel-slide"}
              src={photo.src}
              alt={index === activeSlide ? photo.alt : ""}
              aria-hidden={index !== activeSlide}
            />
          ))}
          <div className="story-carousel-controls" aria-label={`${item.title} gallery controls`}>
            <button type="button" onClick={() => setSlide((current) => (current - 1 + gallery.length) % gallery.length)} aria-label={`Previous ${item.title} photo`}>
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            {gallery.length > MAX_DOTS ? (
              <p className="story-carousel-count" aria-live="polite">{activeSlide + 1} / {gallery.length}</p>
            ) : (
              <div className="story-carousel-dots">
                {gallery.map((photo, index) => (
                  <button
                    key={photo.src}
                    type="button"
                    className={index === activeSlide ? "active" : ""}
                    onClick={() => setSlide(index)}
                    aria-label={`Show ${item.title} photo ${index + 1} of ${gallery.length}`}
                    aria-current={index === activeSlide ? "true" : undefined}
                  />
                ))}
              </div>
            )}
            <button type="button" onClick={() => setSlide((current) => (current + 1) % gallery.length)} aria-label={`Next ${item.title} photo`}>
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : item.video ? (
        <video className="story-video" autoPlay muted loop playsInline preload="metadata" poster={item.image} aria-label={item.alt}>
          <source src={item.video} type="video/mp4" />
        </video>
      ) : (
        <img className="pillar-image" src={item.image} alt={item.alt} />
      )}
    </div>
  );
}

export default function PurposeStories() {
  return (
    <section className="mission section-shell" id="mission">
      <div className="section-intro">
        <div className="eyebrow">What moves us</div>
        <h2>More than a breed.<br /><em>A way to give back.</em></h2>
        <p>We bring furparents and their furbabies together to serve our communities, grow alongside each other, and turn a gathering into something that gives back.</p>
      </div>

      <div className="pillar-list">
        {activities.map((item, index) => (
          <article className="pillar-row" key={item.title}>
            <div className="pillar-copy">
              <span className="pillar-number">{String(index + 1).padStart(2, "0")}</span>
              <div className="eyebrow">{item.eyebrow}</div>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
            </div>
            <StoryMedia item={item} />
          </article>
        ))}
      </div>
    </section>
  );
}
