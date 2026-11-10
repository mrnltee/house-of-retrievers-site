import { breedIcon, breedLabel } from "../../../lib/breeds.mjs";
import { splitFurbabyNames } from "../../../lib/attendeeNames.mjs";
import { sexLabel } from "../../../lib/furbabySex.mjs";
import { ageLabel, humanYearsLabel } from "../../../lib/furbabyAge.mjs";

/**
 * Each furbaby as its breed icon + name, spaced apart: "🐶 Khalee  🐶 Audrey". One who crossed
 * the rainbow bridge (`rainbow[i]`) gets a soft gold halo above the icon and a 🌈.
 * Names come from the saved line ("Khalee and Audrey"), breeds by position;
 * a breed without a name shows the breed instead, a name without a breed shows
 * the name alone. With a gender (`sexes[i]`, migration 098) the name is blue for
 * male and pink for female; without one it keeps the usual colour. With an age
 * (`ages[i]`, migration 100) it follows the name in parentheses, "Mochi (3 yrs)",
 * and hovering or focusing it shows the human-years equivalent.
 */
export default function FurbabyList({ names, breeds, rainbow = null, sexes = null, ages = null, size = 22, empty = "—" }) {
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
        const sex = sexLabel(sexes?.[i]) ? sexes[i] : "";
        const age = ageLabel(ages?.[i]);
        const human = age ? humanYearsLabel(ages[i]) : "";
        return (
          <span key={i} className={`furbaby-item${remembered ? " is-remembered" : ""}`} title={[name, sexLabel(sex), key ? breedLabel(key) : "", remembered ? "Over the rainbow bridge" : ""].filter(Boolean).join(" · ")}>
            <span className="furbaby-icon" style={{ width: size, height: size }} aria-hidden="true">
              {remembered ? <span className="furbaby-halo" /> : null}
              {icon ? <img src={icon} alt="" width={size} height={size} /> : null}
            </span>
            <span className={sex ? `furbaby-name is-${sex}` : "furbaby-name"}>{name}{remembered ? <span className="furbaby-rainbow" aria-hidden="true"> 🌈</span> : null}</span>
            {age ? <span className="furbaby-age" tabIndex={0} title="" data-human={human}> ({age})<span className="visually-hidden">, {human.toLowerCase()}</span></span> : null}
            {sex ? <span className="visually-hidden">, {sexLabel(sex).toLowerCase()}</span> : null}
            {key && list[i] ? <span className="visually-hidden"> ({breedLabel(key)})</span> : null}
            {remembered ? <span className="visually-hidden">, in loving memory</span> : null}
          </span>
        );
      })}
    </span>
  );
}
