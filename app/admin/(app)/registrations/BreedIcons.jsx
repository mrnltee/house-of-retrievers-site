import { breedFullLabel, breedIcon, breedLabel } from "../../../lib/breeds.mjs";
import { mixParentsLabel } from "../../../lib/breedMix.mjs";

/** The breed icons (and names, for screen readers and on hover) of an RSVP's furbabies. */
export default function BreedIcons({ breeds, size = 22, withNames = false }) {
  const list = (breeds || []).filter(Boolean);
  if (!list.length) return null;
  return (
    <span className="breed-icons">
      {list.map((key, i) => {
        const icon = breedIcon(key);
        return (
          <span key={`${key}-${i}`} className="breed-icon" title={breedFullLabel(key)}>
            {icon ? <img src={icon} alt="" width={size} height={size} /> : null}
            {withNames
              ? <span>{breedLabel(key)}{mixParentsLabel(key) ? <span className="breed-mix-parents-line"> ({mixParentsLabel(key)})</span> : null}</span>
              : <span className="visually-hidden">{breedFullLabel(key)}</span>}
          </span>
        );
      })}
    </span>
  );
}
