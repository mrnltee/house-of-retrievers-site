import { Dog, Heart, UsersRound } from "lucide-react";
import Icon from "./Icon";

function FamilyDogMark() {
  return (
    <span className="mini-mark family-dog-mark" aria-hidden="true">
      <UsersRound className="family-dog-people" size={23} strokeWidth={1.45} />
      <Dog className="family-dog-pet" size={17} strokeWidth={1.55} />
      <Heart className="family-dog-heart" size={10} strokeWidth={1.6} fill="currentColor" />
    </span>
  );
}

export default function FinalCta({ onJoin }) {
  return (
    <section className="final-cta" id="finalCTA" aria-label="Join the House of Retrievers community">
      <video className="final-cta-video" autoPlay muted loop playsInline preload="metadata" aria-hidden="true">
        <source src="/CTA-join-us.MP4" type="video/mp4" />
      </video>
      <div className="final-cta-shade" />
      <div><FamilyDogMark /><p>There’s always room<br />{" "}for one more pawsome pawmily.</p></div>
      <button className="button cream" onClick={onJoin}>COME JOIN US <Icon name="paw" size={18} /></button>
    </section>
  );
}
