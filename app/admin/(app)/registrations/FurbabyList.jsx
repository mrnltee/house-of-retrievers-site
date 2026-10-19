import { breedIcon, breedLabel } from "../../../lib/breeds.mjs";
import { splitFurbabyNames } from "../../../lib/attendeeNames.mjs";

/**
 * Each furbaby as its breed icon + name, spaced apart: "🐶 Khalee  🐶 Audrey". One who crossed
 * the rainbow bridge (`rainbow[i]`) gets a soft gold halo above the icon and a 🌈.
 * Names come from the saved line ("Khalee and Audrey"), breeds by position;
 * a breed without a name shows the breed instead, a name without a breed shows
 * the name alone.
 */
export default function FurbabyList({ names, breeds, rainbow = null, size = 22, empty = "—" }) {
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
        const remembered = Boolean(rainbow?.[i]);
        return (
          <span key={i} className={`furbaby-item${remembered ? " is-remembered" : ""}`} title={[name, key ? breedLabel(key) : "", remembered ? "Over the rainbow bridge" : ""].filter(Boolean).join(" · ")}>
            <span className="furbaby-icon" style={{ width: size, height: size }} aria-hidden="true">
              {remembered ? <span className="furbaby-halo" /> : null}
              {icon ? <img src={icon} alt="" width={size} height={size} /> : null}
            </span>
            <span>{name}{remembered ? <span className="furbaby-rainbow" aria-hidden="true"> 🌈</span> : null}</span>
            {key && list[i] ? <span className="visually-hidden"> ({breedLabel(key)})</span> : null}
            {remembered ? <span className="visually-hidden">, in loving memory</span> : null}
          </span>
        );
      })}
    </span>
  );
}
