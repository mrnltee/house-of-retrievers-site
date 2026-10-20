"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LogoMoments from "../components/LogoMoments";

export default function MediaHeader() {
  const [stuck, setStuck] = useState(false);

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
        <a href="#about">About</a>
        <a href="#stories">Stories</a>
        <a href="#partnerships">Partnerships</a>
        <a href="#downloads">Downloads</a>
        <a className="media-nav-contact" href="mailto:houseofretrieversph@gmail.com">Contact media</a>
      </nav>
    </header>
  );
}
