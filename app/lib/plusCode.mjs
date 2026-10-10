/**
 * Plus codes (Open Location Code), as Google Maps shows them:
 * a full code such as "7Q63H4XX+2V", or a short one with an area after it,
 * such as "H4XX+2V Makati". Decoding happens here, offline; a short code
 * needs a nearby reference point, which the caller finds by looking up the
 * area name. Spec: https://github.com/google/open-location-code
 */

const ALPHABET = "23456789CFGHJMPQRVWX";
const SEPARATOR_POSITION = 8;
const PAIR_RESOLUTIONS = [20, 1, 0.05, 0.0025, 0.000125];
const GRID_ROWS = 5;
const GRID_COLUMNS = 4;

/** Finds a plus code in free text. @returns {{ code: string, rest: string } | null} */
export function findPlusCode(text) {
  const match = String(text || "").match(/(^|[\s,])([23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]{0,7})(?=[\s,]|$)/i);
  if (!match) return null;
  const code = match[2].toUpperCase();
  const rest = (text.slice(0, match.index) + " " + text.slice(match.index + match[0].length)).replace(/^[\s,]+|[\s,]+$/g, "").replace(/\s+/g, " ");
  return { code, rest };
}

function valid(code) {
  const sep = code.indexOf("+");
  if (sep < 0 || sep !== code.lastIndexOf("+") || sep > SEPARATOR_POSITION || sep % 2 === 1) return false;
  const digits = code.replace("+", "");
  if ([...digits].some((c) => !ALPHABET.includes(c))) return false;
  return code.length - sep - 1 !== 1;
}

export function isFullCode(code) {
  if (!valid(code) || code.indexOf("+") !== SEPARATOR_POSITION) return false;
  // The first pair must stay within the world: latitude below 90°, longitude below 180°.
  return ALPHABET.indexOf(code[0]) * 20 < 180 && ALPHABET.indexOf(code[1]) * 20 < 360;
}

export function isShortCode(code) {
  return valid(code) && code.indexOf("+") < SEPARATOR_POSITION;
}

/** The centre of a full code's area. @returns {{ lat: number, lng: number }} */
export function decode(code) {
  if (!isFullCode(code)) throw new Error("Not a full plus code");
  const digits = code.replace("+", "");
  let lat = -90;
  let lng = -180;
  let latRes = 400;
  let lngRes = 400;
  for (let i = 0; i < Math.min(digits.length, 10); i += 2) {
    latRes = lngRes = PAIR_RESOLUTIONS[i / 2];
    lat += ALPHABET.indexOf(digits[i]) * latRes;
    lng += ALPHABET.indexOf(digits[i + 1]) * lngRes;
  }
  for (let i = 10; i < digits.length; i += 1) {
    latRes /= GRID_ROWS;
    lngRes /= GRID_COLUMNS;
    const value = ALPHABET.indexOf(digits[i]);
    lat += Math.floor(value / GRID_COLUMNS) * latRes;
    lng += (value % GRID_COLUMNS) * lngRes;
  }
  return { lat: round(Math.min(lat + latRes / 2, 90)), lng: round(lng + lngRes / 2) };
}

/** A 10-digit code for a point (used to complete short codes). */
export function encode(lat, lng) {
  let la = Math.min(Math.max(lat, -90), 90 - 1e-10) + 90;
  let lo = ((((lng + 180) % 360) + 360) % 360);
  let out = "";
  for (const res of PAIR_RESOLUTIONS) {
    const a = Math.floor(la / res);
    const b = Math.floor(lo / res);
    la -= a * res;
    lo -= b * res;
    out += ALPHABET[a] + ALPHABET[b];
  }
  return `${out.slice(0, 8)}+${out.slice(8)}`;
}

/** The point a short code means near a reference point. */
export function recoverNearest(shortCode, refLat, refLng) {
  if (!isShortCode(shortCode)) throw new Error("Not a short plus code");
  const missing = SEPARATOR_POSITION - shortCode.indexOf("+");
  const resolution = 20 ** (2 - missing / 2);
  const half = resolution / 2;
  const prefix = encode(refLat, refLng).replace("+", "").slice(0, missing);
  let { lat, lng } = decode(prefix + shortCode);
  if (refLat + half < lat && lat - resolution >= -90) lat -= resolution;
  else if (refLat - half > lat && lat + resolution <= 90) lat += resolution;
  if (refLng + half < lng) lng -= resolution;
  else if (refLng - half > lng) lng += resolution;
  return { lat: round(lat), lng: round(lng) };
}

/** "14.5547, 121.0244" pasted as coordinates. @returns {{ lat: number, lng: number } | null} */
export function parseCoordinates(text) {
  const match = String(text || "").trim().match(/^(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

function round(n) {
  return Math.round(n * 1e6) / 1e6;
}
