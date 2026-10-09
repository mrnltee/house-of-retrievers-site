// The dogs' moments. Each one starts and ends on the static logo, so a moment
// can begin or finish at any time without a jump.
//
// Light mode is daytime: the dogs are alert and playful. Dark mode is evening:
// they doze, stargaze and lean on each other. `dog` says who moves ("pack" is
// both). `duration` drives the CSS through --hor-moment-duration, so the
// keyframes in globals.css never need their own timings.

export const logoMoments = Object.freeze({
  light: Object.freeze([
    { id: "golden-wag", dog: "golden", duration: 1500, weight: 3 },
    { id: "golden-look-up", dog: "golden", duration: 1900, weight: 2 },
    { id: "golden-paw", dog: "golden", duration: 1800, weight: 2 },
    { id: "lab-perk", dog: "lab", duration: 1300, weight: 2 },
    { id: "lab-sniff", dog: "lab", duration: 1500, weight: 2 },
    { id: "lab-paw", dog: "lab", duration: 1800, weight: 2 },
    { id: "pack-look-up", dog: "pack", duration: 2300, weight: 1 },
  ]),
  dark: Object.freeze([
    { id: "golden-doze", dog: "golden", duration: 3400, weight: 2 },
    { id: "golden-thump", dog: "golden", duration: 2400, weight: 2 },
    { id: "lab-stargaze", dog: "lab", duration: 3200, weight: 2 },
    { id: "lab-doze", dog: "lab", duration: 3400, weight: 2 },
    { id: "pack-snuggle", dog: "pack", duration: 3200, weight: 1 },
  ]),
});

export const logoTiming = Object.freeze({
  // The brand intro covers the page for 3s; the first moment lands just after
  // it lifts, so the header logo picks up where the intro's nod left off.
  firstDelay: 3800,
  minGap: 7000,
  maxGap: 15000,
  // Moving content that runs on its own should stop by itself (WCAG 2.2.2).
  // After this many unprompted moments the dogs rest, and only play again
  // when a visitor points at or focuses the logo.
  autoplayLimit: 8,
});

export function momentSetFor(colorScheme) {
  return colorScheme === "dark" ? logoMoments.dark : logoMoments.light;
}

// Weighted pick that never plays the same moment twice in a row.
export function pickMoment(moments, previousId, random = Math.random) {
  const pool = moments.length > 1 ? moments.filter((moment) => moment.id !== previousId) : moments;
  const total = pool.reduce((sum, moment) => sum + moment.weight, 0);
  let roll = random() * total;
  for (const moment of pool) {
    roll -= moment.weight;
    if (roll < 0) return moment;
  }
  return pool[pool.length - 1];
}

export function nextGap(random = Math.random) {
  return Math.round(logoTiming.minGap + random() * (logoTiming.maxGap - logoTiming.minGap));
}
