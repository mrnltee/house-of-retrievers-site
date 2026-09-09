import { Dog, Heart, UsersRound } from "lucide-react";
import Icon from "./Icon";
import BackgroundVideo from "./BackgroundVideo";

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
      <BackgroundVideo className="final-cta-video" src="/CTA-join-us.MP4" poster="/cta-join-us-poster.jpg" aria-hidden="true" />
      <div className="final-cta-shade" />
      <div><FamilyDogMark /><p>There’s always room<br />{" "}for one more pawsome pawmily.</p></div>
      <button className="button cream" onClick={onJoin}>COME JOIN US <Icon name="paw" size={18} /></button>
    </section>
  );
}
