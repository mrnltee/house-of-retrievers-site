/**
 * Quotes about patience for the countdown page, and the schedule that picks
 * one. Everyone sees the same quote at the same moment; it changes at slot
 * boundaries that fall 5 to 15 minutes apart, so a refresh keeps the quote
 * and a later visit may bring a new one.
 */

export const QUOTES = [
  { text: "Adopt the pace of nature: her secret is patience.", by: "Ralph Waldo Emerson" },
  { text: "He that can have patience can have what he will.", by: "Benjamin Franklin" },
  { text: "Patience and time do more than strength or passion.", by: "Jean de La Fontaine" },
  { text: "All things are difficult before they are easy.", by: "Thomas Fuller" },
  { text: "How poor are they that have not patience! What wound did ever heal but by degrees?", by: "William Shakespeare, Othello" },
  { text: "The two most powerful warriors are patience and time.", by: "Leo Tolstoy, War and Peace" },
  { text: "Patience is the companion of wisdom.", by: "Attributed to Saint Augustine" },
  { text: "To every thing there is a season, and a time to every purpose under the heaven.", by: "Ecclesiastes 3:1" },
  { text: "One minute of patience, ten years of peace.", by: "Greek proverb" },
  { text: "Rivers know this: there is no hurry. We shall get there some day.", by: "A. A. Milne, Winnie-the-Pooh" },
  { text: "Slow and steady wins the race.", by: "Aesop" },
  { text: "Nature does not hurry, yet everything is accomplished.", by: "Attributed to Lao Tzu" },
  { text: "Sit. Stay. Good things are worth the wait.", by: "Every retriever, ever" },
  { text: "A retriever never doubts the ball is coming. Neither should you.", by: "House of Retrievers" },
];

const MINUTE = 60 * 1000;
/** Slots are counted from here, so the schedule is the same on every server and browser. */
const ANCHOR = Date.parse("2026-10-09T00:00:00+08:00");

/** Small deterministic hash (mulberry32 step) → [0, 1). */
function rand(seed) {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Length of slot `i`: a whole number of minutes from 5 to 15. */
const slotLength = (i) => (5 + Math.floor(rand(i * 7919) * 11)) * MINUTE;

/**
 * The quote showing at `now`, and when it next changes.
 * @returns {{ index: number, quote: {text: string, by: string}, changesAt: number }}
 */
export function quoteAt(now = Date.now()) {
  let start = ANCHOR;
  let slot = 0;
  let previous = -1;
  let index = 0;
  // A few hundred steps at most for any date this page will live through.
  for (;;) {
    index = Math.floor(rand(slot * 104729 + 17) * QUOTES.length);
    if (index === previous) index = (index + 1) % QUOTES.length;
    const end = start + slotLength(slot);
    if (now < end || now < ANCHOR) return { index, quote: QUOTES[index], changesAt: end };
    previous = index;
    start = end;
    slot += 1;
  }
}
