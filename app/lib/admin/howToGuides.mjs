/**
 * Animated "How it works" guides (owner, 2026-11-15): each brand action shown
 * as a short loop on a simplified mock of the screen, with a pointer that
 * moves to what you'd press. Pure data, so it can be tested: a step names the
 * mock (`scene`), what it looks like (`state`), what the pointer points at
 * (`target`), what happens there (`act`: click, tick, type) and the caption.
 * `HowTo.jsx` plays them; `HowToScenes.jsx` draws the mocks.
 */

/** Every pointer target each mock draws (a step's target must be one of its scene's). */
export const SCENE_TARGETS = {
  tracker: ["invite", "followAll", "row1Tick", "row2Tick", "row1Follow", "row1Send", "row2Send", "review", "newRow"],
  invite: ["search", "pick1", "pick2", "add", "addNew"],
  send: ["letter", "to1", "to2", "tab1", "tab2", "own", "write", "send", "confirm"],
  editor: ["subject", "message", "use"],
  brandForm: ["name", "kind", "code", "event", "create"],
};

export const GUIDES = {
  "send-one": {
    title: "Send a letter to one brand",
    steps: [
      { scene: "tracker", target: "row1Send", act: "click", caption: "On the event's Brand tracker, press Send letter on the brand's row. No tick needed." },
      { scene: "send", state: { to: ["to1"] }, target: "letter", caption: "The send window opens with that brand already ticked and the event's letter chosen. Switch the letter here if you need another." },
      { scene: "send", state: { to: ["to1"] }, target: "tab1", caption: "The preview on the right is the email exactly as they'll get it, addressed to them." },
      { scene: "send", state: { to: ["to1"] }, target: "send", act: "click", caption: "Press Send to 1." },
      { scene: "send", state: { to: ["to1"], confirm: true }, target: "confirm", act: "click", caption: "Check the summary, then Yes, send letters." },
      { scene: "tracker", state: { sent: ["row1"] }, target: "row1Send", caption: "Back on the tracker, their Invite letter column shows Sent and the time." },
    ],
  },
  "follow-up": {
    title: "Follow up a brand that hasn't replied",
    steps: [
      { scene: "tracker", target: "row1Follow", act: "click", caption: "A brand on No reply yet whose invite went out has a Follow up button. Press it." },
      { scene: "send", state: { to: ["to1"], letter: "Follow-up: brands with no reply yet" }, target: "letter", caption: "The send window opens with the follow-up email, already filled in with the event's name, date and place." },
      { scene: "send", state: { to: ["to1"], letter: "Follow-up: brands with no reply yet" }, target: "write", act: "click", caption: "Want to add a line? ✎ Edit wording changes it for this send only." },
      { scene: "send", state: { to: ["to1"], letter: "Follow-up: brands with no reply yet" }, target: "send", act: "click", caption: "Press Send to 1, then confirm." },
      { scene: "tracker", target: "followAll", act: "click", caption: "To follow up everyone still waiting at once, use Follow up · N at the top instead." },
    ],
  },
  "send-many": {
    title: "Send one letter to several brands",
    steps: [
      { scene: "tracker", target: "row1Tick", act: "tick", caption: "Tick the brands you want. Tick boxes are for sending one letter to several at once." },
      { scene: "tracker", state: { ticked: ["row1"] }, target: "row2Tick", act: "tick", caption: "Tick as many as you need (up to 25 a send)." },
      { scene: "tracker", state: { ticked: ["row1", "row2"] }, target: "review", act: "click", caption: "Press Review & send in the bar above the table." },
      { scene: "send", state: { to: ["to1", "to2"] }, target: "tab2", act: "click", caption: "Each ticked brand gets a preview tab, so you can check every email." },
      { scene: "send", state: { to: ["to1"] }, target: "to2", act: "tick", caption: "Untick someone and their tab disappears: only the people being sent to are previewed." },
      { scene: "send", state: { to: ["to1"] }, target: "send", act: "click", caption: "Press Send, then confirm. Each brand gets their own email." },
    ],
  },
  "own-email": {
    title: "Write your own email instead of a letter",
    steps: [
      { scene: "send", state: { to: ["to1"] }, target: "own", act: "tick", caption: "In the send window, tick Write my own email (email only). No letter and no PDF go out." },
      { scene: "editor", target: "subject", act: "type", text: "Thank you for your time", caption: "The editor opens with a placeholder. Write your subject…" },
      { scene: "editor", state: { subject: "Thank you for your time" }, target: "message", act: "type", text: "It was lovely meeting your team today.", caption: "…and your message. Keep Dear [Salutation]: it becomes each brand's name." },
      { scene: "editor", state: { subject: "Thank you for your time", message: "It was lovely meeting your team today." }, target: "use", act: "click", caption: "Press Use this wording. HOR's sign-off and footer are added below it." },
      { scene: "send", state: { to: ["to1"], own: true }, target: "send", act: "click", caption: "Send stays off until the placeholder is replaced. Then send and confirm." },
    ],
  },
  invite: {
    title: "Invite brands to an event",
    steps: [
      { scene: "tracker", target: "invite", act: "click", caption: "On the event's Brand tracker, press + Invite brands." },
      { scene: "invite", target: "search", act: "type", text: "paw", caption: "Search the brand directory by name." },
      { scene: "invite", state: { query: "paw" }, target: "pick1", act: "tick", caption: "Tick the brands to invite." },
      { scene: "invite", state: { query: "paw", picked: ["pick1"] }, target: "add", act: "click", caption: "Press Add to this event, then confirm. Nothing is emailed yet." },
      { scene: "tracker", state: { added: true }, target: "newRow", caption: "They're on the tracker as No reply yet. Send them the invite with Send letter." },
    ],
  },
  "add-brand": {
    title: "Add a brand that isn't in the directory",
    steps: [
      { scene: "invite", target: "search", act: "type", text: "Pawsome Treats", caption: "In + Invite brands (or the Brands & Partners search), type the brand's name." },
      { scene: "invite", state: { query: "Pawsome Treats", empty: true }, target: "addNew", act: "click", caption: "No brand by that name? Press Add “…” as a new brand." },
      { scene: "brandForm", target: "name", caption: "The Add a brand window opens over the page, with the name already typed." },
      { scene: "brandForm", target: "kind", act: "click", caption: "Choose whether they're a Sponsor or a Partner. A 4-letter code is suggested from the name." },
      { scene: "brandForm", target: "event", caption: "Opened from an event, that event is already ticked under Add to events." },
      { scene: "brandForm", target: "create", act: "click", caption: "Press Create, then confirm. Logo, links and contact can wait." },
      { scene: "tracker", state: { added: true, newName: "Pawsome Treats" }, target: "newRow", caption: "You're back on the event's Brand tracker with the new brand on it." },
    ],
  },
};

/** The brand guides, in the order the guide list shows them. */
export const BRAND_GUIDES = ["send-one", "follow-up", "send-many", "own-email", "invite", "add-brand"];

/** How long a step stays up while playing, in ms: longer captions get a little longer. */
export function stepDuration(step) {
  const words = String(step?.caption || "").split(/\s+/).filter(Boolean).length;
  const typing = step?.act === "type" ? String(step.text || "").length * 45 : 0;
  return Math.min(7000, Math.max(2800, 1400 + words * 160 + typing));
}
