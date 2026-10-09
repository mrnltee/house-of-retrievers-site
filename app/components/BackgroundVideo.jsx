import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

/**
 * Decorative looping video. Loads only when visible, stops offscreen or when
 * motion is reduced, and carries its own pause button (WCAG 2.2.2: moving
 * content that lasts more than five seconds needs a way to stop it).
 *
 * The button is positioned by the parent section, which must be
 * `position: relative`. `controlLabel` names the video for screen readers
 * ("Pause hero video"); `controlClassName` lets a section place the button.
 */
export default function BackgroundVideo({ src, controlLabel = "background video", controlClassName = "", ...props }) {
  const ref = useRef(null);
  const pausedByVisitor = useRef(false);
  const [paused, setPaused] = useState(false);
  const [motionReduced, setMotionReduced] = useState(false);
  const updateRef = useRef(() => {});

  useEffect(() => {
    const video = ref.current;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const update = () => {
      setMotionReduced(motion.matches);
      if (visible && !motion.matches && !document.hidden && !pausedByVisitor.current) {
        if (!video.getAttribute("src")) video.src = src;
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    };
    updateRef.current = update;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(video);
    motion.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
      video.pause();
    };
  }, [src]);

  const toggle = () => {
    pausedByVisitor.current = !pausedByVisitor.current;
    setPaused(pausedByVisitor.current);
    updateRef.current();
  };

  return (
    <>
      <video ref={ref} {...props} muted loop playsInline preload="none" />
      {/* Nothing moves when motion is reduced, so there is nothing to pause. */}
      {!motionReduced && (
        <button
          type="button"
          className={`video-toggle ${controlClassName}`.trim()}
          onClick={toggle}
          aria-label={`${paused ? "Play" : "Pause"} ${controlLabel}`}
        >
          {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
        </button>
      )}
    </>
  );
}
