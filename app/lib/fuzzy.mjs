/** Lowercase, no accents, words only: "Aëternal-Paws" → "aeternal paws". */
export const fold = (text) => String(text || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9@.]+/g, " ").trim();

/** Edit distance (with swaps) between a and b, giving up past `max`. */
function distance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev2 = null;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) row[j] = Math.min(row[j], prev2[j - 2] + 1);
      best = Math.min(best, row[j]);
    }
    if (best > max) return max + 1;
    prev2 = prev;
    prev = row;
  }
  return prev[b.length];
}

/**
 * Forgiving search: every word typed must appear in the text, as part of a word,
 * or as the start of a word with a typo or two ("acuavrde" finds Acuaverde).
 */
export function fuzzyMatch(query, text) {
  const words = fold(query).split(" ").filter(Boolean);
  if (!words.length) return true;
  const hay = fold(text);
  const hayWords = hay.split(" ");
  return words.every((w) => {
    if (hay.includes(w)) return true;
    if (w.length < 3) return false;
    const max = w.length >= 7 ? 2 : 1;
    return hayWords.some((h) => distance(w, h.slice(0, w.length), max) <= max || distance(w, h, max) <= max);
  });
}
