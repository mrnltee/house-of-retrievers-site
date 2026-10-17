import { breedIcon, breedLabel } from "../../../lib/breeds.mjs";

/** The breed icons (and names, for screen readers and on hover) of an RSVP's furbabies. */
export default function BreedIcons({ breeds, size = 22, withNames = false }) {
  const list = (breeds || []).filter(Boolean);
  if (!list.length) return null;
  return (
    <span className="breed-icons">
      {list.map((key, i) => {
        const icon = breedIcon(key);
        return (
          <span key={`${key}-${i}`} className="breed-icon" title={breedLabel(key)}>
            {icon ? <img src={icon} alt="" width={size} height={size} /> : null}
            <span className={withNames ? "" : "visually-hidden"}>{breedLabel(key)}</span>
          </span>
        );
      })}
    </span>
  );
}
