// Builds a consistent set of breed head icons (64x64, transparent) plus a labelled preview sheet.
import { mkdirSync, writeFileSync } from "node:fs";

const OUT = process.argv[2];
mkdirSync(OUT, { recursive: true });

const INK = "#2B2118";
const LINE = "rgba(43,33,24,.22)";
const both = (d, fill, extra = "") => `<path d="${d}" fill="${fill}" ${extra}/><g transform="translate(64 0) scale(-1 1)"><path d="${d}" fill="${fill}" ${extra}/></g>`;
const outline = `stroke="${LINE}" stroke-width="1"`;

function eyes({ y = 33, dx = 7, r = 2.7, iris = INK, ring = null } = {}) {
  const one = (x) => `${ring ? `<circle cx="${x}" cy="${y}" r="${r + 0.9}" fill="${ring}"/>` : ""}<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 1.12}" fill="${iris}"/>${iris !== INK ? `<circle cx="${x}" cy="${y}" r="${r * 0.48}" fill="${INK}"/>` : ""}<circle cx="${x + r * 0.35}" cy="${y - r * 0.42}" r="${r * 0.36}" fill="#fff"/>`;
  return one(32 - dx) + one(32 + dx);
}
function face({ y = 40, nose = INK, w = 3.2, smile = 1, tongue = false, line = INK } = {}) {
  const mouth = `<path d="M32 ${y + 3.2}v1.4m0 0q-${2.2 * smile} ${2 * smile} -${4.2 * smile} .7m4.2 -.7q${2.2 * smile} ${2 * smile} ${4.2 * smile} .7" stroke="${line}" stroke-width="1.3" stroke-linecap="round" fill="none"/>`;
  const t = tongue ? `<path d="M30.4 ${y + 5.2}q1.6 3.4 3.2 0z" fill="#E77B83"/>` : "";
  return `${t}${mouth}<path d="M${32 - w} ${y}q${w} -1.3 ${w * 2} 0q0 2.6 -${w} 3.4q-${w} -.8 -${w} -3.4z" fill="${nose}"/>`;
}
function scallop(cx, cy, r, bumps, depth, fill, extra = "") {
  let d = "";
  for (let i = 0; i <= bumps; i++) {
    const a = (i / bumps) * Math.PI * 2;
    const m = ((i - 0.5) / bumps) * Math.PI * 2;
    const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
    const qx = cx + (r + depth) * Math.cos(m), qy = cy + (r + depth) * Math.sin(m);
    d += i === 0 ? `M${x.toFixed(2)} ${y.toFixed(2)}` : `Q${qx.toFixed(2)} ${qy.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return `<path d="${d}Z" fill="${fill}" ${extra}/>`;
}

const BREEDS = [
  ["aspin", "Aspin / Asong Pinoy", () => `
    ${both("M20.5 26L15.5 8.5Q23 11 28 20Z", "#B9773B")}
    ${both("M20.8 22.5L17.6 12.4Q22.6 14.6 25.2 19.6Z", "#EBC39A")}
    <path d="M17 31Q17 18.5 32 18.5Q47 18.5 47 31Q47 42.5 40 47Q32 51 24 47Q17 42.5 17 31Z" fill="#C98A4A"/>
    <path d="M32 21.5Q29.8 29 28.8 36H35.2Q34.2 29 32 21.5Z" fill="#F2DDC2"/>
    <ellipse cx="32" cy="42.2" rx="7" ry="6" fill="#F2DDC2"/>
    ${eyes()}${face()}`],
  ["shih-tzu", "Shih Tzu", () => `
    <path d="M13 31Q10.6 46 14.4 55Q17.6 51.4 20.6 55.6Q23.6 51.6 26.6 55.4L37.4 55.4Q40.4 51.6 43.4 55.6Q46.4 51.4 49.6 55Q53.4 46 51 31Q49 16.5 32 16.5Q15 16.5 13 31Z" fill="#D9A862" ${outline}/>
    <path d="M28.2 19Q26.6 10.6 32 9.2Q37.4 10.6 35.8 19Z" fill="#D9A862" ${outline}/>
    <path d="M30 17.6Q29.6 12.6 32 11.4" stroke="#B88A45" stroke-width="1" stroke-linecap="round" fill="none"/>
    <ellipse cx="32" cy="35" rx="13.5" ry="13" fill="#F7F1E7"/><path d="M29.6 25Q31 18.4 32 17.4Q33 18.4 34.4 25Z" fill="#F7F1E7"/>
    ${both("M20 33a5.2 4.8 0 1 0 10.2 0a5.2 4.8 0 1 0 -10.2 0Z", "#E6BC7C")}
    <path d="M32 40Q24.5 40 22.5 47.5Q28 49 32 44.5Q36 49 41.5 47.5Q39.5 40 32 40Z" fill="#FFFFFF" ${outline}/>
    ${eyes({ y: 33.2, dx: 7, r: 3.1 })}${face({ y: 38.6, w: 2.8, smile: 0.8 })}`],
  ["chihuahua", "Chihuahua", () => `
    ${both("M19.5 27.5L7 7.5Q20 8 27.5 21Z", "#DFA86C")}
    ${both("M19.2 24L10.6 11.6Q19 12.6 24.6 20.8Z", "#F5CBAA")}
    <ellipse cx="32" cy="33.5" rx="14.2" ry="14" fill="#E9B779"/>
    <ellipse cx="32" cy="41.6" rx="6.2" ry="4.8" fill="#F6D8B0"/>
    ${eyes({ y: 32.4, dx: 6.8, r: 3.3 })}${face({ y: 39.4, w: 2.6, smile: 0.8 })}`],
  ["pomeranian", "Pomeranian", () => `
    ${scallop(32, 35, 19.5, 16, 3.6, "#E7913C")}
    ${both("M22.5 20L21.5 10.5Q27 12.5 29 18Z", "#D47C28")}
    <ellipse cx="32" cy="34.5" rx="12.5" ry="11.8" fill="#F2A856"/>
    <ellipse cx="32" cy="41" rx="6.2" ry="4.6" fill="#FAD7A6"/>
    ${eyes({ y: 33, dx: 6.4, r: 2.9 })}${face({ y: 38.8, w: 2.6, smile: 0.8 })}`],
  ["poodle", "Poodle", () => `
    ${both("M17 27a5.6 5.6 0 1 0 0.01 0ZM15.6 37a5.6 5.6 0 1 0 0.01 0ZM17.4 46a5 5 0 1 0 0.01 0Z", "#E9DDCB", outline)}
    <path d="M24 17a6 6 0 1 1 7 -6a6 6 0 1 1 9 6a5.5 5.5 0 1 1 -3 9h-10a5.5 5.5 0 1 1 -3 -9Z" fill="#F1E8DA" ${outline}/>
    <ellipse cx="32" cy="35.5" rx="11" ry="14" fill="#F8F2E9" ${outline}/>
    <ellipse cx="32" cy="43.5" rx="6.2" ry="5.8" fill="#FFFCF7"/>
    ${eyes({ y: 33, dx: 5.8, r: 2.5 })}${face({ y: 41.8, w: 2.7, smile: 0.8 })}`],
  ["toy-poodle", "Toy Poodle", () => `
    ${both("M15.5 30a5.4 5.4 0 1 0 0.01 0ZM14.6 39a5.4 5.4 0 1 0 0.01 0ZM16.6 47a4.8 4.8 0 1 0 0.01 0Z", "#B5683A")}
    ${scallop(32, 33, 15.5, 14, 2.6, "#C97C47")}
    ${scallop(32, 17.5, 5.5, 8, 1.4, "#C97C47")}
    ${scallop(32, 42, 7.6, 10, 1.4, "#DE9A68")}
    ${eyes({ y: 32.5, dx: 6.6, r: 2.8 })}${face({ y: 40, w: 2.7, smile: 0.8 })}`],
  ["golden-retriever", "Golden Retriever", () => `
    ${both("M17.5 24C9.5 26 7.5 38 11 46C13.8 49.4 18 47 19.5 41Z", "#AD8330")}
    ${both("M11.5 40l-1.6 4.2M14 43.5l-1 3.8", "none", 'stroke="#946E26" stroke-width="1.2" stroke-linecap="round"')}
    <ellipse cx="32" cy="33.5" rx="15" ry="15" fill="#D4A548"/>
    <ellipse cx="32" cy="42.2" rx="8" ry="6" fill="#EBCB86"/>
    ${eyes()}${face()}`],
  ["labrador-retriever", "Labrador Retriever", () => `
    ${both("M18.5 23C12 24 10 32 11.6 39C13.4 42.6 18 41 19.6 36Z", "#1D1A17", 'stroke="#5A524A" stroke-width="1"')}
    <ellipse cx="32" cy="33.5" rx="15.8" ry="14.8" fill="#35302B" stroke="#5A524A" stroke-width="1"/>
    <ellipse cx="32" cy="42.2" rx="8.6" ry="6.2" fill="#4A433C"/>
    ${eyes({ iris: "#6B4423", ring: "#251F1A" })}${face({ nose: "#0F0D0C", line: "#0F0D0C" })}`],
  ["siberian-husky", "Siberian Husky", () => `
    ${both("M19.5 24L16 7.5Q24.5 10.5 28.5 19Z", "#5B6570")}
    ${both("M19.8 21L17.6 11.6Q23 13.6 25.6 18.6Z", "#F2E4E4")}
    <ellipse cx="32" cy="33.5" rx="15.6" ry="15" fill="#6C7681"/>
    <path d="M17 33.5Q19.5 26 25.5 27Q30 28 32 33.5Q34 28 38.5 27Q44.5 26 47 33.5Q48 44.5 40 48Q32 51.2 24 48Q16 44.5 17 33.5Z" fill="#F4F6F8"/>
    ${eyes({ iris: "#3E9FE0" })}${face()}`],
  ["german-shepherd", "German Shepherd", () => `
    ${both("M20 25L16.5 6.5Q25.5 9.5 28.5 20Z", "#2A2420", 'stroke="#5A4A3C" stroke-width="1"')}
    ${both("M20.4 21.6L18.4 11.2Q23.8 13.4 25.6 19Z", "#7A5433")}
    <ellipse cx="32" cy="34" rx="14.2" ry="15.2" fill="#C68A45"/>
    <path d="M26.5 21.5Q32 19.8 37.5 21.5Q37 30 36.4 37H27.6Q27 30 26.5 21.5Z" fill="#3A2F27"/>
    <ellipse cx="32" cy="42.4" rx="7.6" ry="6.2" fill="#3A2F27"/>
    <circle cx="24.6" cy="28.4" r="1.5" fill="#E8B06C"/><circle cx="39.4" cy="28.4" r="1.5" fill="#E8B06C"/>
    ${eyes()}${face({ nose: "#0D0D0D", line: "#0D0D0D" })}`],
  ["beagle", "Beagle", () => `
    ${both("M18 24C10 25 8.6 40 11.8 48C14.6 52 19.8 48.6 20.2 40Z", "#7B4B26")}
    <ellipse cx="32" cy="33.5" rx="14.6" ry="14.6" fill="#C7863F"/>
    <path d="M30.2 20.2Q32 18.6 33.8 20.2L35.4 36.5H28.6Z" fill="#FBF6EE"/>
    <ellipse cx="32" cy="42.4" rx="8.8" ry="6.6" fill="#FBF6EE"/>
    ${eyes()}${face()}`],
  ["dachshund", "Dachshund", () => `
    ${both("M20 23.5C12.5 25.5 11.6 40 14.6 47C17.6 50.4 22 45.6 22 38Z", "#7E3F1E")}
    <ellipse cx="32" cy="31" rx="12.8" ry="12.8" fill="#AA582C"/>
    <ellipse cx="32" cy="41.5" rx="6.6" ry="9" fill="#B8693B"/>
    ${eyes({ y: 30.4, dx: 6.2, r: 2.6 })}${face({ y: 45.6, w: 2.8, smile: 0.8 })}`],
  ["french-bulldog", "French Bulldog", () => `
    ${both("M19.5 25.5C11.5 22 9.5 10 15.5 7.6C21.5 6.4 27 15.4 27 21.6Z", "#D9B48A")}
    ${both("M19.6 22.4C14 20 12.8 12.4 16.4 10.8C20.2 10.2 23.6 15.8 24 19.6Z", "#EEC1AE")}
    <path d="M14.6 32.5Q14.6 20.5 32 20.5Q49.4 20.5 49.4 32.5Q49.4 46.5 32 48.5Q14.6 46.5 14.6 32.5Z" fill="#E5C39B"/>
    <ellipse cx="32" cy="40.6" rx="9.6" ry="6.6" fill="#3B312A"/>
    <path d="M29.6 26.5q2.4 1.6 4.8 0M30.4 29q1.6 1 3.2 0" stroke="#B99168" stroke-width="1.1" stroke-linecap="round" fill="none"/>
    ${eyes({ y: 32.4, dx: 8.4, r: 3 })}${face({ y: 38.2, w: 3.6, nose: "#0D0D0D", line: "#0D0D0D" })}`],
  ["corgi", "Corgi", () => `
    ${both("M19 26.5L12.5 6.5Q24.5 8.5 28.5 19Z", "#DB8638")}
    ${both("M19.2 23L15 10.8Q22.4 12.4 25.2 18.6Z", "#F8D9B8")}
    <ellipse cx="32" cy="34" rx="15" ry="14.2" fill="#E5933F"/>
    <path d="M30.6 20.8Q32 19.4 33.4 20.8L36.2 34.5H27.8Z" fill="#FFF8EE"/>
    <ellipse cx="32" cy="42.4" rx="9.4" ry="6.6" fill="#FFF8EE"/>
    ${eyes()}${face()}`],
  ["american-bully", "American Bully", () => `
    ${both("M20.2 21.4Q12.4 18.6 10.2 25.4Q14.8 24.4 18.4 27.8Z", "#5F6973")}
    ${both("M12.4 23.6Q15.4 23.6 18 25.6", "none", 'stroke="#4B545D" stroke-width="1.1" stroke-linecap="round"')}
    <path d="M11.5 33.5Q11.5 19.5 32 19.5Q52.5 19.5 52.5 33.5Q52.5 47.5 32 50.5Q11.5 47.5 11.5 33.5Z" fill="#7C8691"/>
    <path d="M26.4 25.6q2.8 -1.6 5.6 0M32 25.6q2.8 -1.6 5.6 0" stroke="#66707A" stroke-width="1.1" stroke-linecap="round" fill="none"/>
    <ellipse cx="32" cy="42.4" rx="11" ry="7" fill="#9DA6AF"/><path d="M28 46.2Q32 49.6 36 46.2Q34.6 49.8 32 50Q29.4 49.8 28 46.2Z" fill="#E9ECEF"/>
    <path d="M15.6 38q1.8 4.6 5.6 6.4M48.4 38q-1.8 4.6 -5.6 6.4" stroke="#6A737D" stroke-width="1.2" stroke-linecap="round" fill="none"/>
    ${eyes({ y: 32.6, dx: 8, r: 2.5 })}${face({ y: 40, w: 3.6, nose: "#3D434A", smile: 1.25, tongue: true })}`],
  ["pit-bull", "Pit Bull–type dog", () => `
    ${both("M20.2 21.4Q12.4 18.6 10.2 25.4Q14.8 24.4 18.4 27.8Z", "#9C6136")}
    ${both("M12.4 23.6Q15.4 23.6 18 25.6", "none", 'stroke="#7E4C29" stroke-width="1.1" stroke-linecap="round"')}
    <path d="M14 32.5Q14 19.5 32 19.5Q50 19.5 50 32.5Q50 44.5 40.4 48.6Q32 51.4 23.6 48.6Q14 44.5 14 32.5Z" fill="#BA7B4A"/>
    <path d="M31 21.6Q32 20.6 33 21.6L34.6 35H29.4Z" fill="#FBF3EA"/>
    <ellipse cx="32" cy="42.4" rx="9.4" ry="6.4" fill="#F1DFCD"/>
    ${eyes({ y: 32.6, dx: 7.4, r: 2.6 })}${face({ y: 40, w: 3.3, nose: "#8C4C30", smile: 1.2, tongue: true })}`],
  ["yorkshire-terrier", "Yorkshire Terrier", () => `
    <path d="M20.2 27Q15 36 16.4 51.6Q19.8 49.6 22.6 52.4Q23.8 46 24 38Z" fill="#66737F"/>
    <g transform="translate(64 0) scale(-1 1)"><path d="M20.2 27Q15 36 16.4 51.6Q19.8 49.6 22.6 52.4Q23.8 46 24 38Z" fill="#66737F"/></g>
    ${both("M21.5 23.5L19.2 11Q25.8 13 28.2 20Z", "#B67F45")}
    ${both("M21.8 21L20.4 14.4Q24.4 15.8 26 19.4Z", "#E6B98A")}
    <ellipse cx="32" cy="34.5" rx="12.6" ry="12.2" fill="#D7A46A"/>
    <path d="M29.6 23Q29 16.2 32 14.8Q35 16.2 34.4 23Z" fill="#C9935A"/>
    <path d="M32 39.4Q25 39.8 23.6 47.6Q28.4 49.2 32 44.6Q35.6 49.2 40.4 47.6Q39 39.8 32 39.4Z" fill="#E7BE8A"/>
    ${eyes({ y: 33, dx: 6.2, r: 2.7 })}${face({ y: 38.6, w: 2.6, smile: 0.8 })}`],
  ["maltese", "Maltese", () => `
    ${both("M18.6 26Q12 28 12.4 40Q12.6 50 17.6 54.6Q22.4 54 24.6 49.6Q24.6 38 22 29Z", "#F3EEE6", outline)}
    <path d="M28.8 21.4Q28 13.4 32 12Q36 13.4 35.2 21.4Z" fill="#FFFFFF" ${outline}/>
    <ellipse cx="32" cy="35" rx="12.4" ry="12.4" fill="#FFFFFF" ${outline}/>
    <path d="M32 40Q26 40.4 24.6 47Q28.8 48.2 32 44.6Q35.2 48.2 39.4 47Q38 40.4 32 40Z" fill="#FBF8F3" ${outline}/>
    ${eyes({ y: 33.2, dx: 6, r: 2.8 })}${face({ y: 39, w: 2.6, smile: 0.8 })}`],
  ["bichon-frise", "Bichon Frise", () => `
    ${scallop(32, 33.5, 18.5, 16, 3, "#FFFFFF", outline)}
    <ellipse cx="32" cy="35" rx="12.6" ry="11.6" fill="#FBF8F2"/>
    ${scallop(32, 41.6, 6.6, 9, 1.2, "#FFFFFF", outline)}
    ${eyes({ y: 32.4, dx: 6.2, r: 2.9, ring: "#EDE4D8" })}${face({ y: 39.6, w: 2.6, smile: 0.8 })}`],
  ["chow-chow", "Chow Chow", () => `
    ${scallop(32, 35, 20, 15, 3.4, "#B9622A")}
    ${both("M20.5 20.4Q19.6 13.6 25.6 15.4Q27 18.4 25.8 21Z", "#9E5222")}
    <ellipse cx="32" cy="35" rx="13" ry="12" fill="#C9763A"/>
    <ellipse cx="32" cy="41.6" rx="8.4" ry="5.8" fill="#D88E52"/>
    <path d="M23 31.6q2.6 -1.4 5.2 0M35.8 31.6q2.6 -1.4 5.2 0" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" fill="none"/>
    <path d="M30.2 44.6q1.8 4 3.6 0z" fill="#3B3F63"/>
    ${face({ y: 39.4, w: 3.2, smile: 0.9 })}`],
  ["belgian-malinois", "Belgian Malinois", () => `
    ${both("M20 25L16.8 7.5Q25.4 10 28.4 20Z", "#2A2420", 'stroke="#5A4A3C" stroke-width="1"')}
    ${both("M20.4 21.6L18.6 12Q23.6 14 25.4 19Z", "#6B4A2E")}
    <ellipse cx="32" cy="34" rx="14" ry="15" fill="#D6A15C"/>
    <path d="M28.4 30Q32 28.6 35.6 30L36.4 37H27.6Z" fill="#3A2F27"/><ellipse cx="32" cy="42.4" rx="8" ry="6.4" fill="#3A2F27"/>
    ${eyes()}${face({ nose: "#0D0D0D", line: "#0D0D0D" })}`],
  ["cocker-spaniel", "Cocker Spaniel", () => `
    ${both("M18.6 24C11 23.6 8 34 8.6 44Q8.2 50 12 51.6Q12.6 48.4 15.4 50.6Q16.6 47 19.4 47.6Q21.4 40 20.6 32Z", "#A9672E")}
    ${both("M11 37q2 2 4.4 1.2M10.4 43q2.2 2 4.8 1", "none", 'stroke="#8C5424" stroke-width="1.1" stroke-linecap="round"')}
    <path d="M18 34Q17.6 17 32 17Q46.4 17 46 34Q45.6 45 39 48.6Q32 51.4 25 48.6Q18.4 45 18 34Z" fill="#C58642"/>
    <ellipse cx="32" cy="42.6" rx="7.6" ry="5.8" fill="#DCA368"/>
    ${eyes({ y: 33.4, dx: 6.6, r: 3 })}${face({ y: 40.4, w: 3 })}`],
  ["shiba-inu", "Shiba Inu", () => `
    ${both("M20.5 25L17.4 12.5Q24.4 14.2 28 21Z", "#C9692A")}
    ${both("M20.8 22L19 15.4Q23.4 16.8 25.4 20.2Z", "#F4E2C6")}
    <ellipse cx="32" cy="34" rx="15" ry="14.4" fill="#D77A35"/>
    <path d="M17.2 36Q22 34 26 37Q29 40 32 40Q35 40 38 37Q42 34 46.8 36Q46.4 45.6 39 48.8Q32 51.2 25 48.8Q17.6 45.6 17.2 36Z" fill="#FBF0DF"/>
    <circle cx="25" cy="28.2" r="1.6" fill="#FBF0DF"/><circle cx="39" cy="28.2" r="1.6" fill="#FBF0DF"/>
    ${eyes()}${face()}`],
  ["akita", "Akita", () => `
    ${both("M18.4 25.6L16.6 14.2Q24.2 15 27.6 21.6Z", "#B9824E")}
    <path d="M13.8 33.5Q13.8 19.6 32 19.6Q50.2 19.6 50.2 33.5Q50.2 46.6 32 50Q13.8 46.6 13.8 33.5Z" fill="#CF9A64"/>
    <path d="M15.6 37Q21 35 25.6 38.6Q29 41.6 32 41.6Q35 41.6 38.4 38.6Q43 35 48.4 37Q47.4 46.8 32 49.4Q16.6 46.8 15.6 37Z" fill="#FAF1E4"/>
    <ellipse cx="32" cy="42" rx="8.6" ry="5.6" fill="#FAF1E4"/>
    ${eyes({ y: 32.6, dx: 7.6, r: 2.3 })}${face({ y: 39.8, w: 3.3 })}`],
  ["jack-russell-terrier", "Jack Russell Terrier", () => `
    ${both("M19.2 21.2Q12.6 20.6 12.6 26.6Q16 25.6 20.6 28.6Z", "#B9742F")}
    <ellipse cx="32" cy="34" rx="14.4" ry="14.4" fill="#FBF7F0" ${outline}/>
    ${both("M18.6 30Q19.6 23.2 26 22.6Q30 24.4 29.4 31Q28 37.4 22 37Q18.4 35.4 18.6 30Z", "#C98339")}
    <ellipse cx="32" cy="42.4" rx="7.6" ry="5.8" fill="#FFFFFF" ${outline}/>
    ${eyes()}${face()}`],
  ["samoyed", "Samoyed", () => `
    ${scallop(32, 36, 19, 15, 3.4, "#FFFFFF", outline)}
    ${both("M21 23L18.6 10.6Q25.6 12.6 28.4 19.6Z", "#FFFFFF", outline)}
    ${both("M21.4 20.4L20 13.6Q24.4 15.2 26 18.8Z", "#F2DCDA")}
    <ellipse cx="32" cy="35" rx="12.4" ry="11.6" fill="#FAF7F1"/>
    <ellipse cx="32" cy="42" rx="7" ry="5.2" fill="#FFFFFF" ${outline}/>
    ${eyes({ y: 33, dx: 6.4, r: 2.6 })}${face({ y: 39.6, w: 2.8, smile: 1.25, tongue: true })}`],
  ["dalmatian", "Dalmatian", () => `
    ${both("M18.4 23.6C11.4 24.6 9.6 33 11.4 40C13.2 43.6 18 41.6 19.6 36.6Z", "#FFFFFF", outline)}
    ${both("M13.2 30a1.8 1.8 0 1 0 0.01 0ZM15.4 36.4a1.5 1.5 0 1 0 0.01 0Z", "#2B2724")}
    <ellipse cx="32" cy="33.5" rx="15" ry="14.8" fill="#FFFFFF" ${outline}/>
    <circle cx="22.4" cy="24.6" r="1.9" fill="#2B2724"/><circle cx="41" cy="23.4" r="1.6" fill="#2B2724"/><circle cx="28" cy="21.4" r="1.2" fill="#2B2724"/>
    <circle cx="44.6" cy="34.4" r="1.6" fill="#2B2724"/><circle cx="19.4" cy="36.6" r="1.4" fill="#2B2724"/><circle cx="37.2" cy="27.2" r="1.1" fill="#2B2724"/>
    <ellipse cx="32" cy="42.2" rx="8" ry="6" fill="#FBF9F6"/>
    <circle cx="25.6" cy="45.4" r="1" fill="#2B2724"/><circle cx="38.6" cy="45" r="1" fill="#2B2724"/>
    ${eyes()}${face()}`],
  ["lhasa-apso", "Lhasa Apso", () => `
    <path d="M13.4 31Q11 47 15 55.4Q18.4 51.8 21.6 56Q24.8 52 28 55.8H36Q39.2 52 42.4 56Q45.6 51.8 49 55.4Q53 47 50.6 31Q48.6 16.6 32 16.6Q15.4 16.6 13.4 31Z" fill="#D9B27A"/>
    ${both("M14.4 31Q12.6 43 15 51.6Q17.6 50 19.6 51Q20.4 40 18.6 30Z", "#8A6A45")}
    <path d="M32 17.4V27" stroke="#B48C55" stroke-width="1.2" stroke-linecap="round"/>
    <ellipse cx="32" cy="35.6" rx="12.4" ry="12" fill="#E8CA97"/>
    <path d="M32 40.6Q25.6 41 24.4 48.4Q28.8 49.6 32 45.4Q35.2 49.6 39.6 48.4Q38.4 41 32 40.6Z" fill="#8A6A45"/>
    ${eyes({ y: 33.6, dx: 6.2, r: 2.7 })}${face({ y: 39.4, w: 2.7, smile: 0.8, line: "#F6E6CC" })}`],
  ["borzoi", "Borzoi", () => `
    ${both("M22.6 20.6Q15.6 17.4 13.6 22.4Q18.4 23 21.6 25.6Z", "#D8B583")}
    <path d="M21.4 26Q21.4 16.6 32 16.6Q42.6 16.6 42.6 26Q42.6 38 37 47Q33.6 53.6 32 53.6Q30.4 53.6 27 47Q21.4 38 21.4 26Z" fill="#FBF6EE" ${outline}/>
    <path d="M23 24Q24 17.6 31 17Q34.6 20 33.6 25.6Q31.4 30.4 26 30Q22.8 28.4 23 24Z" fill="#D8B583"/>
    ${eyes({ y: 27.6, dx: 5, r: 2.2 })}
    <path d="M30 49.6q2 -1.1 4 0q0 2.2 -2 2.9q-2 -.7 -2 -2.9z" fill="${INK}"/>`],
];

const svg = (inner, title) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="${title}"><title>${title}</title>${inner.replace(/\s+\n\s*/g, "")}</svg>\n`;
const cells = [];
for (const [slug, name, draw] of BREEDS) {
  const s = svg(draw(), name);
  writeFileSync(`${OUT}/${slug}.svg`, s);
  cells.push(`<figure><div class="big">${s}</div><div class="small"><span>${s}</span><span>${s}</span></div><figcaption>${name}</figcaption></figure>`);
}
writeFileSync(`${OUT}/preview.html`, `<!doctype html><meta charset="utf-8"><title>Breed icons</title>
<style>body{margin:0;padding:24px;font:14px/1.3 system-ui,sans-serif;background:#F6F1E7;color:#2B2118}h1{font-size:18px;margin:0 0 4px}p{margin:0 0 18px;color:#6b5d4f}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}figure{margin:0;background:#fff;border-radius:14px;padding:12px;display:grid;justify-items:center;gap:6px}
.big svg{width:112px;height:112px}.small{display:flex;gap:10px;align-items:center}.small span:first-child svg{width:32px;height:32px}.small span:last-child{background:#1c1a17;border-radius:6px;padding:3px;display:flex}.small span:last-child svg{width:24px;height:24px}figcaption{font-weight:600;text-align:center}</style>
<h1>Breed icons — ${BREEDS.length} · head only · transparent</h1><p>Each shown at 112 px, 32 px (list size) and 24 px on a dark chip.</p><div class="grid">${cells.join("")}</div>`);
console.log(`wrote ${BREEDS.length} icons + preview.html to ${OUT}`);
