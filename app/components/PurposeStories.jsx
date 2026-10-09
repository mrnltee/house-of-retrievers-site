import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import BackgroundVideo from "./BackgroundVideo";
import { activities } from "../content/activities";

/** Above this many photos the dots stop fitting the control pill on a phone. */
const MAX_DOTS = 6;

function StoryMedia({ item }) {
  const container = useRef(null);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [slide, setSlide] = useState(0);
  const gallery = item.gallery;
  const activeSlide = gallery ? slide % gallery.length : 0;

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(motion.matches);
    updateMotion();
    motion.addEventListener("change", updateMotion);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", updateMotion);
    };
  }, []);

  useEffect(() => {
    if (!gallery || !visible || reducedMotion) return;
    const timer = window.setInterval(() => {
      setSlide((current) => (current + 1) % gallery.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [gallery, visible, reducedMotion]);

  return (
    <div className="pillar-media" ref={container}>
      {gallery ? (
        <div className="story-carousel" role="region" aria-roledescription="carousel" aria-label={`${item.title} photos`}>
          {gallery.map((photo, index) => (
            (index === activeSlide || index === (activeSlide + 1) % gallery.length || index === (activeSlide - 1 + gallery.length) % gallery.length) && <img
              key={photo.src}
              className={index === activeSlide ? "story-carousel-slide active" : "story-carousel-slide"}
              src={photo.src}
              loading="lazy"
              decoding="async"
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
        <BackgroundVideo className="story-video" src={item.video} poster={item.image} aria-label={item.alt} controlLabel={`${item.title} video`} />
      ) : (
        <img loading="lazy" decoding="async" className="pillar-image" src={item.image} alt={item.alt} />
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
