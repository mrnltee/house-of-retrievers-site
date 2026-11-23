/** Preset emoji for the team chat's message box (owner, 23 Nov 2026). Each has a name for screen readers. */
export const CHAT_EMOJI = [
  { group: "Reactions", items: [["👍", "Thumbs up"], ["🙏", "Thank you"], ["🙌", "Hooray"], ["👏", "Clapping"], ["🎉", "Party"], ["😊", "Smile"], ["😂", "Laughing"], ["🥹", "Touched"]] },
  { group: "Dogs", items: [["🐶", "Puppy face"], ["🐕", "Dog"], ["🦮", "Guide dog"], ["🐕‍🦺", "Service dog"], ["🐾", "Paw prints"], ["🦴", "Bone"], ["🎾", "Ball"], ["🌈", "Rainbow"]] },
  { group: "Team", items: [["✅", "Done"], ["👀", "Looking"], ["📅", "Calendar"], ["📸", "Photo"], ["💛", "Gold heart"], ["🔥", "Fire"], ["⏰", "Alarm clock"], ["🤝", "Handshake"]] },
];

/**
 * Puts `insert` into `text` in place of the selection [start, end] (the cursor when they're equal), and says
 * where the cursor goes next. Never makes the message longer than `max`: then it returns the text unchanged.
 */
export function insertAtCursor(text = "", insert = "", start = text.length, end = start, max = Infinity) {
  const value = String(text);
  const from = Math.max(0, Math.min(Number.isFinite(start) ? start : value.length, value.length));
  const to = Math.max(from, Math.min(Number.isFinite(end) ? end : from, value.length));
  const next = value.slice(0, from) + insert + value.slice(to);
  if (next.length > max) return { text: value, cursor: to, fits: false };
  return { text: next, cursor: from + insert.length, fits: true };
}
