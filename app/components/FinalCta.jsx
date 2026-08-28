import { UserRoundPlus } from "lucide-react";
import Icon from "./Icon";

export default function FinalCta({ onJoin }) {
  return (
    <section className="final-cta" id="finalCTA" aria-label="Join the House of Retrievers community">
      <video className="final-cta-video" autoPlay muted loop playsInline preload="metadata" aria-hidden="true">
        <source src="/CTA-join-us.MP4" type="video/mp4" />
      </video>
      <div className="final-cta-shade" />
      <div><span className="mini-mark"><UserRoundPlus size={22} strokeWidth={1.5} aria-hidden="true" /></span><p>There is always room<br />for one more good human.</p></div>
      <button className="button cream" onClick={onJoin}>Come join us <Icon name="arrow" /></button>
    </section>
  );
}
