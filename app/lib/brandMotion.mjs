export const INTRO_SESSION_KEY = "hor-brand-intro";
export const motionDurations = Object.freeze({
  intro: 3000,
  interaction: 560,
  reduced: 180,
});

export function shouldShowIntro(storage) {
  try {
    return storage.getItem(INTRO_SESSION_KEY) !== "seen";
  } catch {
    return true;
  }
}

export function markIntroSeen(storage) {
  try {
    storage.setItem(INTRO_SESSION_KEY, "seen");
  } catch {
    // Storage can be disabled by browser privacy settings. The intro remains
    // functional; it simply cannot remember that it has already played.
  }
}
