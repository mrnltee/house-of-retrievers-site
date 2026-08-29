import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Icon from "./Icon";

export default function InstagramFeed() {
  const [posts, setPosts] = useState([]);
  const [status, setStatus] = useState("loading");
  const [slide, setSlide] = useState(0);
  const [direction, setDirection] = useState("next");

  const window_ = useMemo(() => {
    if (!posts.length) return [];
    const visibleCount = Math.min(3, posts.length);
    return Array.from({ length: visibleCount }, (_, index) => posts[(slide + index) % posts.length]);
  }, [posts, slide]);

  useEffect(() => {
    const controller = new AbortController();

    const loadInstagramPosts = async () => {
      try {
        const response = await fetch("/api/instagram", { signal: controller.signal });
        if (!response.ok) throw new Error("Instagram feed is unavailable");
        const payload = await response.json();
        setPosts(Array.isArray(payload.posts) ? payload.posts : []);
        setStatus(payload.posts?.length ? "ready" : "empty");
      } catch (error) {
        if (error.name !== "AbortError") setStatus("error");
      }
    };

    loadInstagramPosts();
    return () => controller.abort();
  }, []);

  return (
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
      <div className="instagram-carousel" role="region" aria-roledescription="carousel" aria-label="Latest House of Retrievers Instagram posts">
        <div className="instagram-toolbar">
          <p aria-live="polite">
            {status === "ready" ? `Showing post ${slide + 1} of ${posts.length}` : "Latest posts from @houseofretrieversph"}
          </p>
          {posts.length > 1 ? (
            <div className="instagram-controls">
              <button
                type="button"
                aria-label="Show previous Instagram post"
                onClick={() => {
                  setDirection("previous");
                  setSlide((current) => (current - 1 + posts.length) % posts.length);
                }}
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Show next Instagram post"
                onClick={() => {
                  setDirection("next");
                  setSlide((current) => (current + 1) % posts.length);
                }}
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>

        {status === "loading" ? (
          <div className="instagram-grid" aria-label="Loading Instagram posts">
            {[0, 1, 2].map((item) => <div className="instagram-skeleton" key={item} />)}
          </div>
        ) : null}

        {status === "ready" ? (
          <div className={`instagram-slide-window instagram-slide-${direction}`} key={slide}>
            <div className="instagram-grid">
            {window_.map((post) => {
              const caption = post.caption?.trim() || "A moment from the House of Retrievers pack.";
              const alt = caption.length > 120 ? `${caption.slice(0, 117)}…` : caption;
              return (
                <a className="instagram-card" href={post.permalink} target="_blank" rel="noreferrer" key={post.id}>
                  <span className="instagram-media">
                    <img src={post.imageUrl} alt={alt} loading="lazy" />
                    {post.mediaType === "VIDEO" ? <span className="instagram-video-badge">Video</span> : null}
                  </span>
                  <span className="instagram-card-copy">
                    <span>{caption}</span>
                    {post.timestamp ? <small>{new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(new Date(post.timestamp))}</small> : null}
                  </span>
                </a>
              );
            })}
            </div>
          </div>
        ) : null}

        {status === "error" || status === "empty" ? (
          <div className="instagram-fallback">
            <p>The latest posts are taking a short paws. You can still catch the full feed on Instagram.</p>
            <a href="https://www.instagram.com/houseofretrieversph/" target="_blank" rel="noreferrer">Open Instagram <Icon name="arrow" size={16} /></a>
          </div>
        ) : null}
      </div>
    </section>
  );
}
