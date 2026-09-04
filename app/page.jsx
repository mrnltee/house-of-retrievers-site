"use client";

import { useCallback, useEffect, useState } from "react";
import BrandTransition from "./components/BrandTransition";
import Header from "./components/Header";
import Hero from "./components/Hero";
import PurposeStories from "./components/PurposeStories";
import InstagramFeed from "./components/InstagramFeed";
import Pack from "./components/Pack";
import FinalCta from "./components/FinalCta";
import Footer from "./components/Footer";
import JoinModal from "./components/JoinModal";

export default function Home() {
  const [packView, setPackView] = useState("impact");
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [interest, setInterest] = useState("Member");
  const [progress, setProgress] = useState(0);
  const [joinTransitionId, setJoinTransitionId] = useState(0);

  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? (window.scrollY / max) * 100 : 0);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view");
    if (view === "impact" || view === "families") setPackView(view);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("view", packView);
    params.delete("story");
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}?${query}${window.location.hash}`);
  }, [packView]);

  const openJoin = () => {
    setMenuOpen(false);
    setJoinTransitionId((current) => current + 1);
  };

  const finishJoinTransition = useCallback(() => {
    setModalOpen(true);
  }, []);

  return (
    <main>
      <a href="#top" className="skip-link">Skip to content</a>
      <div className="scroll-progress" style={{ transform: `scaleX(${progress / 100})` }} />
      <BrandTransition interactionId={joinTransitionId} onInteractionComplete={finishJoinTransition} />

      <Header menuOpen={menuOpen} setMenuOpen={setMenuOpen} onJoin={openJoin} />
      <Hero onJoin={openJoin} />
      <PurposeStories />
      <InstagramFeed />
      <Pack packView={packView} setPackView={setPackView} />
      <FinalCta onJoin={openJoin} />
      <Footer />

      {modalOpen && (
        <JoinModal interest={interest} setInterest={setInterest} onClose={() => setModalOpen(false)} />
      )}
    </main>
  );
}
