"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LogoMoments from "../components/LogoMoments";

const SECTIONS = [["about", "About"], ["stories", "Stories"], ["partnerships", "Partnerships"], ["press-kit", "Press kit"], ["downloads", "Downloads"]];

export default function MediaHeader() {
  const [stuck, setStuck] = useState(false);
  const [current, setCurrent] = useState("");

  // Marks the nav link for the section in the middle of the screen.
  useEffect(() => {
    const sections = SECTIONS.map(([id]) => document.getElementById(id)).filter(Boolean);
    if (!sections.length || !("IntersectionObserver" in window)) return undefined;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) setCurrent(entry.target.id);
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setStuck(window.scrollY > 120));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <header className={`media-header${stuck ? " is-stuck" : ""}`}>
      <div className="media-masthead">
        <Link className="media-brand" href="/" aria-label="House of Retrievers home">
          <LogoMoments tone="dark" priority />
        </Link>
        <div className="media-orgname" aria-label="The House of Retrievers Society Inc.">The House of Retrievers <span>Society Inc.</span></div>
      </div>
      <nav aria-label="Media hub navigation" className="media-nav media-glass-dock">
        {SECTIONS.map(([id, label]) => <a key={id} href={`#${id}`} aria-current={current === id ? "true" : undefined}>{label}</a>)}
        <a className="media-nav-contact" href="mailto:houseofretrieversph@gmail.com">Contact media</a>
      </nav>
    </header>
  );
}
