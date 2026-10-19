import { breedIcon, breedLabel } from "../../../lib/breeds.mjs";
import { splitFurbabyNames } from "../../../lib/attendeeNames.mjs";

/**
 * Each furbaby as its breed icon + name, spaced apart: "🐶 Khalee  🐶 Audrey".
 * Names come from the saved line ("Khalee and Audrey"), breeds by position;
 * a breed without a name shows the breed instead, a name without a breed shows
 * the name alone.
 */
export default function FurbabyList({ names, breeds, size = 22, empty = "—" }) {
  const list = splitFurbabyNames(names);
  const keys = (breeds || []).map((key) => key || "");
  const count = Math.max(list.length, keys.filter(Boolean).length ? keys.length : 0);
  if (!count) return empty ? <span className="muted">{empty}</span> : null;
  return (
    <span className="furbaby-list">
      {Array.from({ length: count }, (_, i) => {
        const key = keys[i] || "";
        const icon = key ? breedIcon(key) : null;
        const name = list[i] || breedLabel(key) || `Furbaby ${i + 1}`;
        return (
          <span key={i} className="furbaby-item" title={key ? `${name} · ${breedLabel(key)}` : name}>
            {icon ? <img src={icon} alt="" width={size} height={size} /> : null}
            <span>{name}</span>
            {key && list[i] ? <span className="visually-hidden"> ({breedLabel(key)})</span> : null}
          </span>
        );
      })}
    </span>
  );
}
