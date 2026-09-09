import { useEffect, useRef } from "react";

/** Load decorative video only when visible; stop playback offscreen or when motion is reduced. */
export default function BackgroundVideo({ src, ...props }) {
  const ref = useRef(null);

  useEffect(() => {
    const video = ref.current;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const update = () => {
      if (visible && !motion.matches && !document.hidden) {
        if (!video.getAttribute("src")) video.src = src;
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(video);
    motion.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
      video.pause();
    };
  }, [src]);

  return <video ref={ref} {...props} muted loop playsInline preload="none" />;
}
