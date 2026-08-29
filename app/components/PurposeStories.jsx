import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Icon from "./Icon";
import { activities } from "../content/activities";

/** Above this many photos the dots stop fitting the control pill on a phone. */
const MAX_DOTS = 6;

export default function PurposeStories({ activeStory, setActiveStory }) {
  const [slide, setSlide] = useState(0);
  const active = activities[activeStory];
  const gallery = active.gallery;
  // Clamp rather than trust the state: galleries differ in length, so the
  // index survives a switch from a longer story to a shorter one.
  const activeSlide = gallery ? slide % gallery.length : 0;

  useEffect(() => {
    setSlide(0);
  }, [activeStory]);

  useEffect(() => {
    if (!gallery || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setSlide((current) => (current + 1) % gallery.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [gallery]);

  return (
    <section className="mission section-shell" id="mission">
      <div className="section-intro">
        <div className="eyebrow">What moves us</div>
        <h2>More than a breed.<br /><em>A way to give back.</em></h2>
        <p>We bring furparents and their furbabies together to serve our communities, grow alongside each other, and turn a gathering into something that gives back.</p>
      </div>

      <div className="story-stage">
        <article className="story-image" aria-label={active.alt}>
          {activities.map((item, index) => (
            <div
              key={item.title}
              className={index === activeStory ? "story-image-layer active" : "story-image-layer"}
              style={{ backgroundImage: `url(${item.image})` }}
            >
              {item.gallery && index === activeStory ? (
                <div className="story-carousel" role="region" aria-roledescription="carousel" aria-label="Paws for a purpose photos">
                  {item.gallery.map((photo, slideIndex) => (
                    <img
                      key={photo.src}
                      className={slideIndex === activeSlide ? "story-carousel-slide active" : "story-carousel-slide"}
                      src={photo.src}
                      alt={slideIndex === activeSlide ? photo.alt : ""}
                      aria-hidden={slideIndex !== activeSlide}
                    />
                  ))}
                  <div className="story-carousel-controls" aria-label="Photo gallery controls">
                    <button
                      type="button"
                      onClick={() => setSlide((current) => (current - 1 + item.gallery.length) % item.gallery.length)}
                      aria-label="Previous photo"
                    >
                      <ChevronLeft size={18} aria-hidden="true" />
                    </button>
                    {item.gallery.length > MAX_DOTS ? (
                      <p className="story-carousel-count" aria-live="polite">
                        {activeSlide + 1} / {item.gallery.length}
                      </p>
                    ) : (
                      <div className="story-carousel-dots">
                        {item.gallery.map((photo, slideIndex) => (
                          <button
                            key={photo.src}
                            type="button"
                            className={slideIndex === activeSlide ? "active" : ""}
                            onClick={() => setSlide(slideIndex)}
                            aria-label={`Show photo ${slideIndex + 1} of ${item.gallery.length}`}
                            aria-current={slideIndex === activeSlide ? "true" : undefined}
                          />
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setSlide((current) => (current + 1) % item.gallery.length)}
                      aria-label="Next photo"
                    >
                      <ChevronRight size={18} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ) : item.video && index === activeStory ? (
                <video
                  className="story-video"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  poster={item.image}
                  aria-hidden="true"
                >
                  <source src={item.video} type="video/mp4" />
                </video>
              ) : null}
            </div>
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
  );
}
