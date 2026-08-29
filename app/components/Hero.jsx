import { Heart } from "lucide-react";
import Icon from "./Icon";

export default function Hero({ onJoin }) {
  return (
    <section className="hero" id="top">
      <video className="hero-photo" autoPlay muted loop playsInline poster="/house-of-retrievers-hero-poster.jpg" aria-hidden="true">
        <source src="/house-of-retrievers-hero-1080p.mp4" type="video/mp4" />
      </video>
      <div className="hero-shade" />
      <div className="hero-copy reveal-now">
        <div className="eyebrow light">A community with heart</div>
        <h1>Good dogs.<br />Good people.<br /><em>Greater Good.</em></h1>
        <p>We’re furparents who raise our retrievers well and bring them along to do some good<br className="desktop-break" /><br className="mobile-break" />{" "}one paw, one person, and one community at a time.</p>
        <div className="hero-actions">
          <button className="button primary" onClick={onJoin}>Join the pack <Icon name="arrow" /></button>
          <a className="text-link" href="#mission">Discover our purpose <span>↓</span></a>
        </div>
      </div>
      <div className="hero-card">
        <span className="heart-badge"><Heart className="promise-heart" fill="currentColor" /></span>
        <div>
          <small>Our shared promise</small>
          <strong>Raise responsibly.<br />Serve generously.</strong>
        </div>
      </div>
      <div className="scroll-cue"><span>Scroll to meet the pack</span><i /></div>
    </section>
  );
}
