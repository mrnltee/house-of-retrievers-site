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
  guestTracker: ["add", "followAll", "review", "messageMany", "g1Tick", "g2Tick", "g1Status", "g2Status", "g1Follow", "g1Invite", "g2Invite", "g1Message", "g2Message"],
  tracker: ["invite", "followAll", "row1Tick", "row2Tick", "row1Follow", "row1Send", "row2Send", "review", "newRow", "row1Edit", "row1Reply", "search", "filterYes", "filterWaiting", "filterUnsent", "sort"],
  regList: ["emailAll", "add", "tabCheck", "tabExpired", "tabWaitlist", "tabNotChecked", "r1Check", "r2Confirm", "r3Checkin", "holdLength", "remindAll", "checkinTime", "checkinYes", "confirm"],
  regPayment: ["receipt", "found", "approve", "reason", "reject", "confirm"],
  regAdd: ["name", "email", "counts", "ticket", "payment", "addBtn", "confirm"],
  reminder: ["startFrom", "wording", "notReminded", "p1", "p2", "p3", "test", "send", "confirm"],
  brandEdit: ["reply", "gives", "items", "coming", "save", "confirm"],
  invite: ["search", "pick1", "pick2", "add", "addNew"],
  send: ["letter", "to1", "to2", "tab1", "tab2", "own", "write", "send", "confirm", "blank"],
  editor: ["subject", "message", "use"],
  brandForm: ["name", "kind", "code", "event", "create"],
  letters: ["details", "edit1", "dup1", "newName", "newLetter", "confirm", "group"],
  letterEditor: ["name", "subject", "cover", "bold", "blankBtn", "body", "preview", "save", "confirm"],
  details: ["field1", "field2", "save"],
  people: ["tick1", "tick2", "send"],
  templates: ["newAcceptance", "newEvent", "edit1"],
  templateEditor: ["tname", "subject", "heading", "message", "chip", "test", "save"],
  eventNew: ["title", "date", "venue", "price", "publish", "confirm"],
  eventLive: ["rsvp", "rsvps"],
  door: ["scan", "welcome"],
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
  // Brand tracker beyond email (owner, 2026-11-17): recording replies and giving, and finding brands.
  "brand-reply": {
    title: "Record a brand's reply and what they're giving",
    steps: [
      { scene: "tracker", target: "row1Reply", caption: "A brand's reply only changes when you record it. Acuaverde said yes by email, so the tracker still says No reply yet." },
      { scene: "tracker", target: "row1Edit", act: "click", caption: "Press Edit under their name. It opens in a window over the tracker." },
      { scene: "brandEdit", target: "reply", act: "click", state: { reply: "Yes" }, caption: "Set Their reply to Yes (or No)." },
      { scene: "brandEdit", state: { reply: "Yes", gives: ["In-kind", "Booth"] }, target: "gives", act: "tick", caption: "Tick what they're giving at this event: cash, in-kind, services, venue or a booth." },
      { scene: "brandEdit", state: { reply: "Yes", gives: ["In-kind", "Booth"] }, target: "items", act: "type", text: "Treats ×20", caption: "Add the amounts or items. Amounts show on the website only if you tick OK to show these amounts." },
      { scene: "brandEdit", state: { reply: "Yes", gives: ["In-kind", "Booth"], items: "Treats ×20", coming: true }, target: "coming", caption: "Note how many people and dogs they're bringing, and any booth needs, so the venue plan is ready." },
      { scene: "brandEdit", state: { reply: "Yes", gives: ["In-kind", "Booth"], items: "Treats ×20", coming: true }, target: "save", act: "click", caption: "Press Save." },
      { scene: "brandEdit", state: { reply: "Yes", gives: ["In-kind", "Booth"], items: "Treats ×20", coming: true, confirm: true }, target: "confirm", act: "click", caption: "Confirm. Nothing is emailed." },
      { scene: "tracker", state: { replies: { row1: "Yes" } }, target: "row1Reply", caption: "They now show Yes. A brand's first Yes gives it its HOR number, and with a logo and blurb it appears on the event page and the home page." },
    ],
  },
  "brand-find": {
    title: "Find brands on the tracker",
    steps: [
      { scene: "tracker", state: { tools: true }, target: "search", act: "type", text: "paw", caption: "Type in the search box to find a brand by name, contact, email or letter." },
      { scene: "tracker", state: { tools: true }, target: "filterWaiting", act: "click", caption: "Or use the filters: No reply yet shows who still needs a follow-up…" },
      { scene: "tracker", state: { tools: true, filter: "waiting" }, target: "filterUnsent", act: "click", caption: "…No invite sent shows who hasn't had a letter for this event…" },
      { scene: "tracker", state: { tools: true, filter: "unsent" }, target: "filterYes", act: "click", caption: "…and Said yes is everyone who will show on the event page." },
      { scene: "tracker", state: { tools: true, filter: "yes" }, target: "sort", act: "click", caption: "Sort by name, by when the letter went out, or by reply. Your choice is remembered for both trackers." },
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

Object.assign(GUIDES, {
  "new-letter": {
    title: "Make a new letter",
    steps: [
      { scene: "letters", target: "newName", act: "type", text: "Thank-you letter (sponsors)", caption: "On Letters, press + New letter at the top. In the window, type a name; only admins see it." },
      { scene: "letters", state: { newName: "Thank-you letter (sponsors)" }, target: "newLetter", act: "click", caption: "Press Make the letter." },
      { scene: "letters", state: { newName: "Thank-you letter (sponsors)", confirm: "Make a new letter?" }, target: "confirm", act: "click", caption: "Confirm. Nothing is sent: it only makes the letter." },
      { scene: "letterEditor", target: "subject", act: "type", text: "Thank you for joining A Golden Beginning", caption: "The editor opens. Step 1: the subject people see in their inbox." },
      { scene: "letterEditor", state: { subject: "Thank you for joining A Golden Beginning" }, target: "body", caption: "It already has the address block, greeting and signature. Write your letter in step 3; the preview beside it updates as you type." },
      { scene: "letterEditor", state: { subject: "Thank you for joining A Golden Beginning" }, target: "save", act: "click", caption: "Press Save and confirm. It's now in Your letters, ready to send." },
    ],
  },
  "duplicate-letter": {
    title: "Start from an existing letter",
    steps: [
      { scene: "letters", target: "dup1", act: "click", caption: "Found a letter close to what you need? Press Duplicate on it." },
      { scene: "letters", state: { confirm: "Make a copy of “Sponsorship letter”?" }, target: "confirm", act: "click", caption: "Confirm. The original stays exactly as it is." },
      { scene: "letterEditor", state: { name: "Sponsorship letter (copy)", subject: "An Invitation to Help Create a Golden Beginning" }, target: "name", caption: "Your copy opens in the editor, marked Your own. Rename it…" },
      { scene: "letterEditor", state: { name: "Sponsorship letter (copy)", subject: "An Invitation to Help Create a Golden Beginning" }, target: "body", caption: "…change the wording you need…" },
      { scene: "letterEditor", state: { name: "Sponsorship letter (copy)", subject: "An Invitation to Help Create a Golden Beginning" }, target: "save", act: "click", caption: "…and Save. Letters made for one event live on that event's Letters page instead." },
    ],
  },
  "edit-letter": {
    title: "Write and format a letter",
    steps: [
      { scene: "letterEditor", target: "cover", caption: "Step 2 is the short email the PDF is attached to. Keep it to a few lines." },
      { scene: "letterEditor", target: "body", caption: "Step 3 is the letter itself, the PDF. Select words, then use the buttons above it." },
      { scene: "letterEditor", target: "bold", act: "click", caption: "Bold, headings, centre, bullets and tables only add marks to the text, so the PDF always matches." },
      { scene: "letterEditor", target: "blankBtn", act: "click", caption: "Blank adds a [fill-in] such as [Company Name]: it becomes each recipient's details when you send." },
      { scene: "letterEditor", target: "preview", act: "click", caption: "Preview PDF shows the real attachment, addressed to a sample recipient, before you save." },
      { scene: "letterEditor", target: "save", act: "click", caption: "Save and confirm. Letters sent from now on use this wording; ones already sent don't change." },
    ],
  },
  "standard-details": {
    title: "Fill in standard details once",
    steps: [
      { scene: "letters", target: "details", act: "click", caption: "Some blanks are the same in every letter, like HOR's contact person or the signatory. Press Standard details." },
      { scene: "details", target: "field1", act: "type", text: "Ms. Alyzza Angeles", caption: "Type each answer once." },
      { scene: "details", state: { field1: "Ms. Alyzza Angeles" }, target: "field2", caption: "Bank and GCash details come from Payment settings by themselves, so they're always current." },
      { scene: "details", state: { field1: "Ms. Alyzza Angeles" }, target: "save", act: "click", caption: "Save. From now on these fill in by themselves when you send; you can still change one for a single send." },
    ],
  },
  "send-letter": {
    title: "Send a letter to people on a list",
    steps: [
      { scene: "people", target: "tick1", act: "tick", caption: "Letters are sent from the lists: the Guest list, Beneficiaries, or an event's Brand tracker. Tick the people." },
      { scene: "people", state: { ticked: ["tick1"] }, target: "tick2", act: "tick", caption: "Tick everyone who should get it (up to 25 a send)." },
      { scene: "people", state: { ticked: ["tick1", "tick2"] }, target: "send", act: "click", caption: "Press Send this letter to ticked." },
      { scene: "send", state: { to: ["to1", "to2"], blank: true }, target: "blank", act: "type", text: "December 5", caption: "Type any blanks the letter still needs. They're the same for everyone in this send." },
      { scene: "send", state: { to: ["to1", "to2"], blank: true, typedBlank: "December 5" }, target: "tab2", act: "click", caption: "Check each person's email and PDF in the preview tabs." },
      { scene: "send", state: { to: ["to1", "to2"], blank: true, typedBlank: "December 5" }, target: "send", act: "click", caption: "Press Send and confirm. Each person gets their own email, and the list shows its delivery status." },
    ],
  },
  // Guest tracker (owner, 2026-11-17): how its emails work — invites, follow-ups and your own messages.
  "guest-invite": {
    title: "Send a guest their invitation",
    steps: [
      { scene: "guestTracker", target: "g2Status", caption: "Letters says who has had an invite. Ramon has none yet, so his row says No invite sent yet." },
      { scene: "guestTracker", target: "g2Invite", act: "click", caption: "Press Invite on his row. It opens his letter: this event's own, or else the one for his group (Media & press)." },
      { scene: "send", state: { guests: true, to: ["to1"], letter: "Invitation: media — Golden Beginning" }, target: "letter", caption: "The send window opens over the tracker with him ticked and his letter chosen. Pick another letter here if you need to." },
      { scene: "send", state: { guests: true, to: ["to1"], letter: "Invitation: media — Golden Beginning" }, target: "tab1", caption: "The preview is the email as he'll get it: addressed to him, with the letter attached as a PDF." },
      { scene: "send", state: { guests: true, to: ["to1"], letter: "Invitation: media — Golden Beginning" }, target: "send", act: "click", caption: "Press Send to 1." },
      { scene: "send", state: { guests: true, to: ["to1"], letter: "Invitation: media — Golden Beginning", confirm: true }, target: "confirm", act: "click", caption: "Check the summary, then Yes, send letters." },
      { scene: "guestTracker", state: { sent: ["g2"] }, target: "g2Status", caption: "Back on the tracker, Letters shows Sent, then Delivered or Opened as the email travels. His button now reads Invite again." },
    ],
  },
  "guest-invite-many": {
    title: "Invite several guests at once",
    steps: [
      { scene: "guestTracker", target: "g1Tick", act: "tick", caption: "Tick the guests who should get the same invitation." },
      { scene: "guestTracker", state: { ticked: ["g1"] }, target: "g2Tick", act: "tick", caption: "Tick as many as you need, up to 25 a send. Filter No invite sent first to find who still needs one." },
      { scene: "guestTracker", state: { ticked: ["g1", "g2"] }, target: "review", act: "click", caption: "Press Review & send. It uses this event's own letter, or else the special guests invitation." },
      { scene: "send", state: { guests: true, to: ["to1", "to2"], letter: "Invitation: special guests — Golden Beginning" }, target: "tab2", act: "click", caption: "Each ticked guest gets a preview tab. Check each one: every email is addressed to that person." },
      { scene: "send", state: { guests: true, to: ["to1"], letter: "Invitation: special guests — Golden Beginning" }, target: "to2", act: "tick", caption: "Untick anyone who shouldn't get it. Only ticked people are sent to and previewed." },
      { scene: "send", state: { guests: true, to: ["to1"], letter: "Invitation: special guests — Golden Beginning" }, target: "send", act: "click", caption: "Press Send and confirm. Each guest gets their own email, never a group email." },
    ],
  },
  "guest-follow-up": {
    title: "Follow up guests with no reply",
    steps: [
      { scene: "guestTracker", target: "g1Follow", act: "click", caption: "Follow up appears on a guest who has had an invite and is still on No reply yet. Press it." },
      { scene: "send", state: { guests: true, to: ["to1"], letter: "Follow-up: guests with no reply yet (email only)" }, target: "letter", caption: "The follow-up is a short email, no PDF, already filled in with the event's name, date and place." },
      { scene: "send", state: { guests: true, to: ["to1"], letter: "Follow-up: guests with no reply yet (email only)" }, target: "write", act: "click", caption: "Want a personal line? Edit wording for this send changes it for this send only; the saved letter stays as it is." },
      { scene: "send", state: { guests: true, to: ["to1"], letter: "Follow-up: guests with no reply yet (email only)" }, target: "send", act: "click", caption: "Press Send to 1, then confirm." },
      { scene: "guestTracker", target: "followAll", act: "click", caption: "To follow up everyone still waiting at once, press Follow up · N at the top. Untick anyone you've already spoken to." },
      { scene: "guestTracker", target: "g1Status", caption: "Their reply stays No reply yet until you record it. When they answer, press Coming or Can't make it on their row and confirm." },
    ],
  },
  "guest-message": {
    title: "Write your own email to a guest",
    steps: [
      { scene: "guestTracker", target: "g1Message", act: "click", caption: "For anything that isn't a letter, such as parking details or a thank-you, press Message on the guest's row." },
      { scene: "guestTracker", state: { ticked: ["g1", "g2"] }, target: "messageMany", act: "click", caption: "Or tick several guests and press Send a message in the bar." },
      { scene: "send", state: { guests: true, to: ["to1"], own: true }, target: "own", caption: "The send window opens with Write my own email ticked: email only, no letter and no PDF." },
      { scene: "editor", target: "subject", act: "type", text: "Parking at Novotel", caption: "Write the subject…" },
      { scene: "editor", state: { subject: "Parking at Novotel" }, target: "message", act: "type", text: "Guest parking is on B2; show this email at the gate.", caption: "…and the message. Keep Dear [Salutation]: it becomes each guest's own greeting." },
      { scene: "editor", state: { subject: "Parking at Novotel", message: "Guest parking is on B2; show this email at the gate." }, target: "use", act: "click", caption: "Press Use this wording. HOR's sign-off and footer are added below it." },
      { scene: "send", state: { guests: true, to: ["to1"], own: true, ownText: "Guest parking is on B2; show this email at the gate." }, target: "send", act: "click", caption: "Check the preview, then Send and confirm. It's logged under Letters like any email." },
    ],
  },
  // An event's Registrations page (owner, 2026-11-17).
  "reg-check-payment": {
    title: "Check a payment and send the QR pass",
    steps: [
      { scene: "regList", target: "tabCheck", act: "click", caption: "When someone sends their receipt, they land under To check. Open that tab." },
      { scene: "regList", state: { tab: "check" }, target: "r1Check", act: "click", caption: "Press Check on their row." },
      { scene: "regPayment", target: "receipt", caption: "Their receipt, method, reference number and amount are side by side. The page says whether the amount matches the ticket." },
      { scene: "regPayment", target: "found", act: "tick", caption: "Look up that reference and amount in HOR's own GCash or bank history. Only when you find it, tick I found reference…" },
      { scene: "regPayment", state: { found: true }, target: "approve", act: "click", caption: "Press Approve and email QR pass." },
      { scene: "regPayment", state: { found: true, confirm: "Approve Maria Santos's payment?", confirmNote: "To check → Paid. Their QR pass is emailed, and you're recorded as the person who checked it." }, target: "confirm", act: "click", caption: "Confirm. Their payment shows Paid, and their QR pass is on its way." },
      { scene: "regList", state: { paid: true }, target: "tabCheck", caption: "Back on the list they're Paid. Nobody gets a QR pass before their payment is approved." },
    ],
  },
  "reg-new-receipt": {
    title: "Ask for a new receipt",
    steps: [
      { scene: "regPayment", target: "receipt", caption: "Can't read the reference, wrong amount, or can't find it in HOR's history? Don't approve it." },
      { scene: "regPayment", target: "reason", act: "click", state: { reason: "The amount doesn't match the ticket…" }, caption: "Pick the reason. It goes into the email, word for word, so they know what to fix." },
      { scene: "regPayment", state: { reason: "The amount doesn't match the ticket…" }, target: "reject", act: "click", caption: "Press Ask for a new receipt." },
      { scene: "regPayment", state: { reason: "The amount doesn't match the ticket…", confirm: "Ask Maria Santos for a new receipt?", confirmNote: "They're emailed the reason and can upload again from their pass page." }, target: "confirm", act: "click", caption: "Confirm. Their new receipt comes back under To check." },
    ],
  },
  "reg-add": {
    title: "Add someone by hand",
    steps: [
      { scene: "regList", target: "add", act: "click", caption: "For someone who paid before the system, a VIP or an organizer, press + Add registration." },
      { scene: "regAdd", target: "name", act: "type", text: "Ms. Malou Perez", caption: "Type their name…" },
      { scene: "regAdd", state: { name: "Ms. Malou Perez" }, target: "email", act: "type", text: "malou@example.com", caption: "…and the email their QR pass goes to." },
      { scene: "regAdd", state: { name: "Ms. Malou Perez", email: "malou@example.com" }, target: "ticket", act: "click", caption: "Pick their ticket. Guests, VIPs and organizers can be Complimentary: no fee, and they don't use up capacity." },
      { scene: "regAdd", state: { name: "Ms. Malou Perez", email: "malou@example.com", ticket: "VIP · Complimentary" }, target: "payment", act: "click", caption: "For a paid ticket, say whether they've paid already (Paid) or still owe (Pending). A complimentary ticket is No fee." },
      { scene: "regAdd", state: { name: "Ms. Malou Perez", email: "malou@example.com", ticket: "VIP · Complimentary" }, target: "addBtn", act: "click", caption: "Press Add registration and confirm. You can add someone even when the event is full." },
    ],
  },
  "reg-email": {
    title: "Email participants a reminder",
    steps: [
      { scene: "regList", target: "emailAll", act: "click", caption: "Before the event, press Email participants to send the reminder and guidelines." },
      { scene: "reminder", target: "startFrom", act: "click", caption: "Start from the standard wording, or one of your own reminder templates." },
      { scene: "reminder", target: "wording", caption: "Change the wording here for this send only. Each email comes with that person's own QR pass." },
      { scene: "reminder", target: "p3", caption: "Everyone with a confirmed spot is ticked. People on the waitlist, unpaid or cancelled are shown but can't be ticked." },
      { scene: "reminder", state: { to: ["p1"] }, target: "notReminded", act: "click", caption: "Sent one already? Not reminded yet ticks only the people who haven't had it." },
      { scene: "reminder", state: { to: ["p1"] }, target: "test", act: "click", caption: "Send a test first. It goes to HOR's own inbox, never to a participant." },
      { scene: "reminder", state: { to: ["p1"] }, target: "send", act: "click", caption: "Press Send and confirm. The page notes when each person was reminded." },
    ],
  },
  "reg-remind-expired": {
    title: "Remind people whose payment time ran out",
    steps: [
      { scene: "regList", target: "tabExpired", act: "click", caption: "Someone who didn't send a receipt in time moves to Hold expired, and their spot is freed. Open that tab." },
      { scene: "regList", state: { tab: "expired" }, target: "holdLength", act: "click", caption: "Choose how long to hold their spot again: 1 hour, 2 hours or 24 hours." },
      { scene: "regList", state: { tab: "expired" }, target: "remindAll", act: "click", caption: "Press Remind all." },
      { scene: "regList", state: { tab: "expired", confirm: "Remind all 1 with an expired hold?", confirmNote: "Each one that still fits gets their spot held again and an email with the new deadline. Anyone with no room left is skipped." }, target: "confirm", act: "click", caption: "Confirm. Anyone the event no longer has room for is skipped and named, with no email." },
    ],
  },
  "reg-checkin": {
    title: "Check someone in by hand",
    steps: [
      { scene: "regList", target: "tabNotChecked", act: "click", caption: "Someone came but wasn't scanned (no QR, or no internet at the door)? Open Not checked in." },
      { scene: "regList", state: { tab: "notchecked" }, target: "r3Checkin", act: "click", caption: "Press Check in on their row." },
      { scene: "regList", state: { tab: "notchecked", checkin: true }, target: "checkinTime", caption: "Set when they arrived. It starts at now; change it if you're catching up from a paper list." },
      { scene: "regList", state: { tab: "notchecked", checkin: true }, target: "checkinYes", act: "click", caption: "Press Check in, then confirm. Payment isn't changed. Undo check-in clears it if you picked the wrong person." },
      { scene: "regList", state: { tab: "notchecked", checkedIn: true }, target: "r3Checkin", caption: "Their status shows Checked in with the time, and Checked in by hand." },
    ],
  },
  "reg-waitlist": {
    title: "Give someone on the waitlist a spot",
    steps: [
      { scene: "regList", target: "tabWaitlist", act: "click", caption: "When someone cancels, open Waitlist." },
      { scene: "regList", state: { tab: "waitlist" }, target: "r2Confirm", act: "click", caption: "Press Confirm on the person who's next." },
      { scene: "regList", state: { tab: "waitlist", confirm: "Give Leo Cruz a spot?", confirmNote: "Waitlist → Confirmed. On a paid event they're emailed how to pay; on a free one, their QR pass." }, target: "confirm", act: "click", caption: "Confirm. On a paid event they're emailed how to pay; on a free event, their QR pass." },
      { scene: "regList", state: { tab: "waitlist", confirmed: true }, target: "r2Confirm", caption: "They're confirmed with payment pending. Their receipt will come in under To check." },
    ],
  },
  "new-template": {
    title: "Make an email template",
    steps: [
      { scene: "templates", target: "newAcceptance", act: "click", caption: "On Email templates, under Your templates, press + New acceptance template (sent when you accept someone) or + New event template (an event's confirmation)." },
      { scene: "templateEditor", target: "tname", act: "type", text: "Volunteer accepted", caption: "Give it a name only admins see." },
      { scene: "templateEditor", state: { tname: "Volunteer accepted" }, target: "subject", act: "type", text: "Welcome to the pack!", caption: "Write the subject and the big heading." },
      { scene: "templateEditor", state: { tname: "Volunteer accepted", subject: "Welcome to the pack!" }, target: "message", caption: "Type the message as it should look. Select words to make them bold or a link." },
      { scene: "templateEditor", state: { tname: "Volunteer accepted", subject: "Welcome to the pack!" }, target: "chip", act: "click", caption: "Click a variable such as {{first_name}} to drop it in where your cursor is: each person sees their own name." },
      { scene: "templateEditor", state: { tname: "Volunteer accepted", subject: "Welcome to the pack!", chip: true }, target: "test", act: "click", caption: "Send a test to me first, and check it in your inbox." },
      { scene: "templateEditor", state: { tname: "Volunteer accepted", subject: "Welcome to the pack!", chip: true }, target: "save", act: "click", caption: "Save. Pick it from a person's profile (Send an email) or in an event's Confirmation email." },
    ],
  },
});

/**
 * The welcome film (owner, 18 Nov 2026, inspired by a product demo the owner shared): one event from start to
 * finish, shown once when someone first opens the admin. `zoom` frames the camera tighter or wider than the
 * default; `build` shimmers over what appears instead of drawing the ring.
 */
GUIDES["welcome-event"] = {
  title: "Run an event, start to finish",
  steps: [
    { scene: "eventNew", target: "title", act: "type", text: "A Golden Beginning", zoom: 1.6, caption: "Start in Events with + New event, and give it a name." },
    { scene: "eventNew", state: { title: "A Golden Beginning" }, target: "date", act: "type", text: "Sat, Dec 12 · 3:00 PM", zoom: 1.6, caption: "Pick the date and the venue." },
    { scene: "eventNew", state: { title: "A Golden Beginning", date: "Sat, Dec 12 · 3:00 PM" }, target: "price", act: "type", text: "₱1,750", zoom: 1.6, caption: "Set the ticket price. Early Bird limits, promo codes and capacity live here too." },
    { scene: "eventNew", state: { title: "A Golden Beginning", date: "Sat, Dec 12 · 3:00 PM", price: "₱1,750" }, target: "publish", act: "click", zoom: 1.3, caption: "Press Publish." },
    { scene: "eventNew", state: { title: "A Golden Beginning", date: "Sat, Dec 12 · 3:00 PM", price: "₱1,750", confirm: true }, target: "confirm", act: "click", zoom: 1.2, caption: "Confirm, and the event page goes live." },
    { scene: "eventLive", state: { rsvps: 0 }, target: "rsvp", zoom: 1, caption: "Your event is on the events site, taking RSVPs." },
    { scene: "eventLive", state: { rsvps: 3 }, target: "rsvps", build: true, zoom: 1.35, caption: "RSVPs come in. Each one holds a spot while they pay." },
    { scene: "regList", state: { tab: "check" }, target: "r1Check", act: "click", zoom: 1.2, caption: "Receipts land under To check on Registrations. Press Check." },
    { scene: "regPayment", target: "found", act: "tick", zoom: 1.3, caption: "Find their reference in HoR's own GCash or bank history, and tick it." },
    { scene: "regPayment", state: { found: true }, target: "approve", act: "click", zoom: 1.3, caption: "Approve. Their QR pass is emailed straight away." },
    { scene: "door", target: "scan", build: true, zoom: 1.15, caption: "On the day, scan their pass at the door." },
    { scene: "door", state: { welcome: true }, target: "welcome", build: true, zoom: 1.05, caption: "They're welcomed by name, with their furbaby. That's the whole loop." },
  ],
};
/** The welcome film, on its own. */
export const WELCOME_GUIDES = ["welcome-event"];

/** The brand guides, in the order the guide list shows them. */
export const BRAND_GUIDES = ["send-one", "follow-up", "send-many", "own-email", "brand-reply", "brand-find", "invite", "add-brand"];
/** An event's Registrations page: payments, adding people, reminders, check-in by hand (owner, 2026-11-17). */
export const REGISTRATION_GUIDES = ["reg-check-payment", "reg-new-receipt", "reg-add", "reg-email", "reg-remind-expired", "reg-checkin", "reg-waitlist"];
/** An event's Guest tracker: invites, follow-ups and your own emails (owner, 2026-11-17). */
export const GUEST_GUIDES = ["guest-invite", "guest-invite-many", "guest-follow-up", "guest-message"];
/** Letters and email templates (owner, 2026-11-15). */
export const LETTER_GUIDES = ["new-letter", "duplicate-letter", "edit-letter", "standard-details", "send-letter", "own-email", "new-template"];

/** How long a step stays up while playing, in ms: longer captions get a little longer. */
export function stepDuration(step) {
  const words = String(step?.caption || "").split(/\s+/).filter(Boolean).length;
  const typing = step?.act === "type" ? String(step.text || "").length * 45 : 0;
  return Math.min(7000, Math.max(2800, 1400 + words * 160 + typing));
}

/* ── A guide on every page (owner, 18 Nov 2026) ─────────────────────────────────────────────────────────────
   These play on the data-driven `page` mock: each step's `state` describes the screen, and every element with a
   `t` can be pointed at (`pageTargets`). Shared screens are built once and varied per step. */

/** Every pointer target a `page` screen draws. */
export function pageTargets(state = {}) {
  const out = [];
  const add = (x) => { if (x?.t) out.push(x.t); };
  (state.head || []).forEach(add);
  (state.tabs || []).forEach(add);
  add(state.search);
  (state.tiles || []).forEach(add);
  (state.fields || []).forEach(add);
  (state.toggles || []).forEach(add);
  (state.rows || []).forEach((r) => { add(r); add(r.tick); (r.btns || []).forEach(add); });
  (state.foot || []).forEach(add);
  if (state.confirm) out.push("confirm");
  return out;
}

const P = (base, extra = {}) => ({ ...base, ...extra });
const step = (state, target, caption, more = {}) => ({ scene: "page", state, target, caption, ...more });

const DASH = {
  title: "Dashboard",
  sub: "What needs you today, then what's coming up.",
  tiles: [
    { t: "tPeople", label: "People", value: "48", note: "4 members · 1 partner" },
    { t: "tNext", label: "Next event", value: "Dec 12", note: "A Golden Beginning" },
    { t: "tWait", label: "Waitlist", value: "3", note: "Open RSVPs" },
    { t: "tPay", label: "Payment changes", value: "0", note: "Nothing to approve" },
  ],
  rows: [
    { name: "2 payments to check", sub: "A Golden Beginning", chip: "Needs you", tone: "warn", btns: [{ t: "needs1", label: "Open RSVPs", tone: "gold" }] },
    { name: "3 new members waiting", sub: "Joined over 7 days ago", chip: "Needs you", tone: "warn", btns: [{ t: "needs2", label: "Open members" }] },
  ],
};

const EVENTS = {
  title: "Events",
  head: [{ t: "create", label: "Create event", tone: "gold" }],
  tabs: [{ t: "tabUp", label: "Upcoming · 2", on: true }, { t: "tabDrafts", label: "Drafts · 1" }, { t: "tabPast", label: "Past · 6" }],
  rows: [
    { name: "A Golden Beginning", sub: "Sat, Dec 12 · Novotel Manila", chip: "12 / 60", btns: [{ t: "edit1", label: "Edit" }, { t: "rsvps1", label: "RSVPs" }] },
    { name: "Weekend Social Run", sub: "Sun, Jan 11 · Filinvest City", chip: "6 confirmed", btns: [{ label: "Edit" }, { label: "Participants" }] },
  ],
};

const EDITOR = {
  title: "A Golden Beginning",
  head: [{ t: "preview", label: "Preview" }, { t: "save", label: "Save", tone: "gold" }],
  tabs: [{ t: "jBasics", label: "Basics", on: true }, { t: "jReg", label: "Registration" }, { t: "jPricing", label: "Pricing" }, { t: "jCheckin", label: "Check-in" }],
  fields: [
    { t: "fTitle", label: "Event name", value: "A Golden Beginning" },
    { t: "fDate", label: "Date and time", value: "Sat, Dec 12 · 3:00 PM" },
    { t: "fCap", label: "Capacity", value: "60" },
    { t: "fPrice", label: "Early Bird · first 20", value: "₱1,750" },
  ],
  toggles: [{ t: "open", label: "Registration is open", on: true }],
};

const REG_INDEX = {
  title: "Registrations",
  sub: "Who's coming to each event, and what still needs checking.",
  rows: [
    { name: "A Golden Beginning", sub: "Sat, Dec 12 · 12 / 60 signed up", chip: "2 payments to check", tone: "warn", btns: [{ t: "open1", label: "Open RSVPs", tone: "gold" }] },
    { name: "Weekend Social Run", sub: "Sun, Jan 11 · 6 confirmed", chip: "Nothing waiting", btns: [{ t: "open2", label: "Open Participants" }] },
  ],
};

const CHECKIN = {
  title: "Check-in",
  sub: "Pick the event, then scan the QR on each guest's confirmation email.",
  rows: [
    { name: "A Golden Beginning", sub: "Today · 3:00 PM · 0 of 48 checked in", chip: "Today", tone: "warn", btns: [{ t: "start", label: "Start check-in", tone: "gold" }, { t: "display", label: "Display screen" }] },
  ],
};

const DOOR_LIST = {
  title: "A Golden Beginning · Check-in",
  head: [{ t: "byName", label: "Find them by name" }, { t: "openDisplay", label: "Open display screen" }],
  tabs: [{ t: "tabIn", label: "Checked in · 12" }, { t: "tabNot", label: "Not checked in · 36", on: true }],
  search: { t: "find", placeholder: "Search a name or furbaby…" },
  rows: [{ name: "Ana Reyes", sub: "with Kobe", chip: "Paid", tone: "good", btns: [{ t: "checkinOne", label: "Check in", tone: "gold" }] }],
};

const PEOPLE = {
  title: "People",
  head: [{ label: "Import" }, { label: "Export CSV" }],
  tabs: [{ t: "kMembers", label: "Members · 48", on: true }, { label: "Volunteers · 6" }, { label: "Partners · 3" }],
  search: { t: "search", placeholder: "Find someone by name, email, furbaby…" },
  tiles: [{ t: "tActive", label: "Active members", value: "41" }, { t: "tWaiting", label: "Waiting over 7 days", value: "3", tone: "warn" }],
  rows: [
    { tick: { t: "tick1" }, t: "p1", name: "Maria Santos", sub: "maria@… · with Mochi", chip: "New", tone: "warn", btns: [{ t: "status1", label: "New ▾" }] },
    { tick: { t: "tick2" }, name: "Leo Cruz", sub: "leo@… · with Biscuit", chip: "Contacted", btns: [{ label: "Contacted ▾" }] },
  ],
};

const BENEF = {
  title: "Beneficiaries",
  head: [{ t: "add", label: "+ Add a beneficiary", tone: "gold" }],
  tabs: [{ label: "All · 4", on: true }, { label: "Partnered · 2" }, { label: "Talking · 1" }],
  search: { t: "search", placeholder: "Search groups…" },
  rows: [
    { tick: { t: "tick1" }, name: "Pawssion Project", sub: "Animal rescue · Pampanga", chip: "On the website", tone: "good", btns: [{ t: "open1", label: "Open" }] },
    { tick: { t: "tick2" }, name: "Little Sisters of the Abandoned Elderly", sub: "Elderly care · QC", chip: "Needs a blurb", tone: "warn", btns: [{ t: "open2", label: "Open" }] },
  ],
};

const BENEF_FORM = {
  title: "Little Sisters of the Abandoned Elderly",
  head: [{ t: "save", label: "Save", tone: "gold" }],
  fields: [
    { t: "status", label: "Status", value: "Partnered" },
    { t: "blurb", label: "Blurb for the website (up to 280)", value: "", placeholder: "One or two sentences about who they care for", tall: true },
  ],
  toggles: [{ t: "show", label: "Show on the website" }],
};

const MEDIA = {
  title: "Media hub",
  head: [{ t: "viewLive", label: "View the live hub" }, { t: "preview", label: "Preview" }, { t: "draft", label: "Save draft" }, { t: "publish", label: "Publish changes", tone: "gold" }],
  tabs: [{ t: "jTop", label: "Top of the page", on: true }, { t: "jTimeline", label: "Activity history" }, { t: "jCommunity", label: "Our community" }, { t: "jPress", label: "Fact sheet" }],
  fields: [
    { t: "heroLead", label: "Hero introduction", value: "The media hub for The House of Retrievers' Society, Inc.", tall: true },
    { t: "followers", label: "Instagram followers", value: "1,408" },
    { t: "asOf", label: "Numbers as of", value: "16 November 2026" },
  ],
};

const PHOTOGS = {
  title: "Photographers",
  head: [{ t: "add", label: "+ Add a photographer", tone: "gold" }],
  rows: [{ name: "Kat Lim Photography", sub: "@katlimphoto · 3 events", btns: [{ t: "edit1", label: "Edit" }] }],
};

const PAY = {
  title: "Payment settings",
  sub: "A change goes live only after a different Owner approves it.",
  rows: [
    { name: "GCash", sub: "0917 ••• 1234 · Live since Nov 2", chip: "Offered", tone: "good", btns: [{ t: "editG", label: "Edit" }] },
    { name: "Bank transfer", sub: "No details yet", chip: "Not offered", btns: [{ t: "addB", label: "Add details" }] },
  ],
};

const LEDGER = {
  title: "Ledger",
  sub: "Every peso in and out, with receipts. Fees, donations and brand cash come in by themselves.",
  head: [{ t: "addExpense", label: "+ Add an expense", tone: "gold" }, { t: "addOther", label: "+ In-kind or income" }, { t: "addTurnover", label: "+ Turnover" }, { t: "report", label: "Transparency report" }],
  tiles: [{ t: "tIn", label: "Cash in", value: "₱48,500" }, { t: "tOut", label: "Spent", value: "₱12,300" }, { t: "tTurn", label: "Turned over", value: "₱30,000" }, { t: "tHeld", label: "Held", value: "₱6,200" }],
  search: { t: "search", placeholder: "Search description, payee, category…" },
  rows: [
    { t: "e1", name: "Venue deposit · Novotel", sub: "Expense · Venue · Nov 3", chip: "Receipt ✓", tone: "good", btns: [{ t: "edit1", label: "Edit" }, { t: "more1", label: "More ▾" }] },
    { name: "Registration fees · 24 paid", sub: "From Registrations", chip: "₱42,000", btns: [{ t: "source1", label: "Open Registrations" }] },
    { name: "Pawssion Project Foundation", sub: "Turnover · cash · Dec 2", chip: "Proof ✓", tone: "good", btns: [{ label: "Edit" }] },
  ],
};

const JOURNEY = {
  title: "Journey timeline",
  head: [{ t: "fromEvent", label: "+ Add from an event", tone: "gold" }, { t: "milestone", label: "+ Add a milestone" }],
  rows: [
    { name: "Pawres de Mayo", sub: "May 2026 · Parklinks Pet Park", chip: "On the website", tone: "good", btns: [{ t: "edit1", label: "Edit" }] },
    { name: "A Golden Beginning", sub: "No date yet", chip: "Draft", btns: [{ t: "edit2", label: "Edit" }] },
  ],
  toggles: [{ t: "show", label: "Show “Our journey” on the website", on: true }],
};

const BREEDS = {
  title: "Breed icons",
  search: { t: "search", placeholder: "Find a breed…" },
  rows: [
    { name: "Golden Retriever", sub: "Built-in icon", btns: [{ t: "upload1", label: "Upload icon" }] },
    { name: "Aspin", sub: "Your icon", btns: [{ t: "builtin2", label: "Use built-in" }] },
  ],
  note: "Square, transparent, head only. SVG, or a 256 × 256 PNG / WebP, up to 100 KB.",
};

const ADMINS = {
  title: "Admins & activity log",
  head: [{ t: "invite", label: "+ Invite an admin", tone: "gold" }],
  rows: [
    { name: "Alyzza Angeles", sub: "alyzza@… · Online", chip: "Owner", btns: [{ t: "roles1", label: "Edit roles" }] },
    { name: "Shey Santos", sub: "shey@… · active 2 h ago", chip: "Admin", btns: [{ t: "roles2", label: "Edit roles" }] },
  ],
  foot: [{ t: "access", label: "Page access: Save all" }, { t: "log", label: "Activity log" }],
};

const PROFILE = {
  title: "My profile",
  fields: [
    { t: "fullName", label: "Full name", value: "Shey Santos" },
    { t: "furbaby", label: "Furbaby's name", value: "" , placeholder: "Macchiato" },
  ],
  toggles: [{ t: "showAs", label: "Show my name as First name / furbaby" }],
  foot: [{ t: "photo", label: "Upload photo" }, { t: "save", label: "Save profile", tone: "gold" }],
};

Object.assign(GUIDES, {
  "dash-read": { title: "Read your dashboard", steps: [
    step(DASH, "tNext", "The tiles count what matters. Each one opens what it counts: here, the next event.", { zoom: 1.4 }),
    step(DASH, "needs1", "Needs you lists what's waiting on someone, like payments to check. Its button opens exactly that.", { zoom: 1.4 }),
    step(DASH, "needs2", "Work down the list. When it's clear, it says so.", { act: "click", zoom: 1.4 }),
  ] },
  "events-create": { title: "Create an event", steps: [
    step(EVENTS, "create", "On Events, press Create event.", { act: "click" }),
    step(P(EDITOR, { title: "Create event", fields: EDITOR.fields.map((f) => ({ ...f, value: "" })) }), "fTitle", "Give it a name, then fill in the date, venue and poster.", { act: "type", text: "A Golden Beginning" }),
    step(EDITOR, "jPricing", "Jump to Pricing to set the ticket price, early bird limits and promo codes.", { act: "click" }),
    step(EDITOR, "save", "Save as a draft any time. It stays private until you publish.", { act: "click" }),
    step(P(EDITOR, { confirm: { title: "Publish A Golden Beginning?", note: "It goes live on the events site and takes RSVPs.", yes: "Yes, publish" } }), "confirm", "Publish when every fact is confirmed, and confirm.", { act: "click" }),
  ] },
  "events-find": { title: "Find and edit an event", steps: [
    step(EVENTS, "tabDrafts", "Upcoming, Drafts and Past tabs show their counts. Drafts are the ones not public yet.", { act: "click" }),
    step(EVENTS, "edit1", "Press Edit on an event to change it.", { act: "click" }),
    step(EDITOR, "jReg", "Jump to moves through the editor: Registration, Pricing, Check-in and more.", { act: "click" }),
    step(EDITOR, "preview", "Preview shows the public page, card and RSVP form before you save.", { act: "click" }),
  ] },
  "event-edit": { title: "Change an event's details", steps: [
    step(EDITOR, "fDate", "Change what you need. The poster, About text and prices are in their own sections.", { act: "click" }),
    step(EDITOR, "fCap", "Under Registration, set the capacity and how long a payment hold lasts.", { act: "type", text: "60" }),
    step(EDITOR, "open", "Switch Registration is open off to stop new RSVPs; the page stays up.", { act: "tick" }),
    step(EDITOR, "save", "Press Save. The box lists what changed before anything is saved.", { act: "click" }),
  ] },
  "event-prices": { title: "Set prices and an early bird", steps: [
    step(EDITOR, "jPricing", "Jump to Pricing.", { act: "click" }),
    step(EDITOR, "fPrice", "Each price has a name and an amount. Limit one to the first 20 for an early bird, or give it a sale period.", { act: "type", text: "₱1,750" }),
    step(EDITOR, "preview", "Preview shows how the prices read on the event page and in the RSVP form.", { act: "click" }),
    step(EDITOR, "save", "Save. Registrations already made keep the price they paid.", { act: "click" }),
  ] },
  "reg-index": { title: "Open an event's RSVPs", steps: [
    step(REG_INDEX, "open1", "Each event shows who's signed up and what needs you, like payments to check.", { zoom: 1.35 }),
    step(REG_INDEX, "open1", "Press Open RSVPs to see the list, check payments and send QR passes.", { act: "click", zoom: 1.35 }),
    step(REG_INDEX, "open2", "Activities like runs and workshops say Participants instead of RSVPs.", { zoom: 1.35 }),
  ] },
  "checkin-door": { title: "Check guests in at the door", steps: [
    step(CHECKIN, "start", "On event day, press Start check-in on today's event.", { act: "click", zoom: 1.4 }),
    { scene: "door", target: "scan", build: true, zoom: 1.15, caption: "Point the camera at the guest's QR pass, on their phone or printed." },
    { scene: "door", state: { welcome: true }, target: "welcome", build: true, zoom: 1.05, caption: "They're welcomed by name. The next scan is ready in a few seconds." },
    step(DOOR_LIST, "byName", "No QR? Press Find them by name.", { act: "click" }),
    step(DOOR_LIST, "find", "Type their name or their furbaby's…", { act: "type", text: "Ana" }),
    step(DOOR_LIST, "checkinOne", "…and press Check in. Unpaid guests are flagged, like a scan.", { act: "click" }),
  ] },
  "checkin-display": { title: "Show arrivals on a big screen", steps: [
    step(CHECKIN, "display", "On a laptop or TV, press Display screen.", { act: "click", zoom: 1.4 }),
    { scene: "door", state: { welcome: true }, target: "welcome", build: true, zoom: 1.05, caption: "Every guest checked in on any phone pops up here by name, with their furbaby." },
    step(DOOR_LIST, "openDisplay", "From a scanner phone, Open display screen does the same.", { act: "click" }),
  ] },
  "people-follow": { title: "Follow up new joiners", steps: [
    step(PEOPLE, "tWaiting", "Waiting over 7 days shows people nobody has contacted yet. Click it to see just them.", { act: "click", zoom: 1.4 }),
    step(PEOPLE, "status1", "Change their follow-up status once you've reached out. Save appears when it changes.", { act: "click" }),
    step(PEOPLE, "p1", "Open someone for their photo, furbabies, events and history.", { act: "click" }),
  ] },
  "people-email": { title: "Email several people", steps: [
    step(PEOPLE, "search", "Search by name, email, handle, furbaby or member number.", { act: "type", text: "Mochi" }),
    step(PEOPLE, "tick1", "Tick the people you want.", { act: "tick" }),
    step(P(PEOPLE, { rows: PEOPLE.rows.map((r, i) => ({ ...r, tick: { ...r.tick, on: i === 0 } })), foot: [{ t: "emailThem", label: "1 selected · Email them", tone: "dark" }] }), "emailThem", "Press Email them. The send window opens so you can write it, preview it and confirm.", { act: "click" }),
  ] },
  "benef-add": { title: "Add a beneficiary", steps: [
    step(BENEF, "add", "Press + Add a beneficiary. Or search: a name with no match offers to add it.", { act: "click" }),
    step(P(BENEF_FORM, { title: "New beneficiary" }), "status", "Fill in who they are, where, what they need and who to contact.", { act: "click" }),
    step(BENEF_FORM, "save", "Save. It's on your list, ready for letters and events.", { act: "click" }),
  ] },
  "benef-website": { title: "Put a beneficiary on the website", steps: [
    step(BENEF, "open2", "The chip says what each one still needs to show on the website. Open it.", { act: "click" }),
    step(BENEF_FORM, "blurb", "Write a short blurb about who they care for.", { act: "type", text: "Caring for elderly women with nowhere else to go." }),
    step(P(BENEF_FORM, { fields: [BENEF_FORM.fields[0], { ...BENEF_FORM.fields[1], value: "Caring for elderly women with nowhere else to go." }] }), "show", "Switch on Show on the website.", { act: "tick" }),
    step(P(BENEF_FORM, { toggles: [{ t: "show", label: "Show on the website", on: true }] }), "save", "Save. Partnered and past groups with a blurb show on the home page.", { act: "click" }),
  ] },
  "benef-letter": { title: "Send beneficiaries a letter", steps: [
    step(BENEF, "tick1", "Tick the groups to write to.", { act: "tick" }),
    step(P(BENEF, { rows: BENEF.rows.map((r, i) => ({ ...r, tick: { ...r.tick, on: i === 0 } })), foot: [{ t: "review", label: "1 selected · Review & send", tone: "dark" }] }), "review", "Press Review & send. You see each email before it goes.", { act: "click" }),
  ] },
  "media-edit": { title: "Update and publish the media hub", steps: [
    step(MEDIA, "jCommunity", "Jump to the section you need, in the same order as the public hub.", { act: "click" }),
    step(MEDIA, "followers", "Update the follower numbers about once a month, with the date.", { act: "type", text: "1,452" }),
    step(MEDIA, "preview", "Preview shows the top of the hub with your changes.", { act: "click" }),
    step(MEDIA, "draft", "Save draft keeps it private while you work…", { act: "click" }),
    step(MEDIA, "publish", "…and Publish changes puts it live. Check every fact and name first.", { act: "click" }),
  ] },
  "photog-add": { title: "Add and credit a photographer", steps: [
    step(PHOTOGS, "add", "Press + Add a photographer: their name, portfolio and socials.", { act: "click" }),
    step(P(EDITOR, { tabs: [{ t: "jPhotos", label: "Photos by", on: true }] }), "jPhotos", "Then on an event's page, tick them under Photos by.", { act: "click" }),
    step(PHOTOGS, "edit1", "Past events show them under “Photos by”, and the media hub credits their photos.", { zoom: 1.35 }),
  ] },
  "pay-change": { title: "Change a payment method", steps: [
    step(PAY, "editG", "Press Edit on a method (or Add details).", { act: "click", zoom: 1.35 }),
    step(P(PAY, { confirm: { title: "Request this GCash change?", note: "A different Owner approves it before it goes live.", yes: "Yes, request change" } }), "confirm", "Change the details and request the change.", { act: "click" }),
    step(PAY, "editG", "A different Owner reviews and approves it. Until then the old details stay live. Switching a method off is immediate.", { zoom: 1.35 }),
  ] },
  "ledger-expense": { title: "Record an expense with its receipt", steps: [
    step(LEDGER, "addExpense", "Press + Add an expense.", { act: "click" }),
    step(P(LEDGER, { fields: [{ t: "fEvent", label: "Event", value: "A Golden Beginning" }, { t: "fCat", label: "Category", value: "Printing & signage" }, { t: "fAmt", label: "Amount (₱)", value: "" }, { t: "fRcpt", label: "Receipt", value: "Choose a photo or PDF" }] }), "fAmt", "Pick the event and category, type what it was for, who was paid and the amount.", { act: "type", text: "2,450" }),
    step(P(LEDGER, { fields: [{ t: "fEvent", label: "Event", value: "A Golden Beginning" }, { t: "fCat", label: "Category", value: "Printing & signage" }, { t: "fAmt", label: "Amount (₱)", value: "2,450" }, { t: "fRcpt", label: "Receipt", value: "Choose a photo or PDF" }] }), "fRcpt", "Attach the receipt: a photo or PDF. Every expense needs one.", { act: "click" }),
    step(P(LEDGER, { confirm: { title: "Add this expense?", note: "It counts in the ledger and the report.", yes: "Yes, add it" } }), "confirm", "Confirm, and it joins the ledger with its receipt.", { act: "click" }),
  ] },
  "ledger-fix": { title: "Edit, remove or restore a line", steps: [
    step(LEDGER, "edit1", "Press Edit to change a line you added: its amount, date, category or receipts.", { act: "click" }),
    step(LEDGER, "more1", "More ▾ → Remove takes it off the ledger and the report. It waits under the Removed tab, where Restore puts it back.", { act: "click" }),
    step(LEDGER, "source1", "Fees, donations and brand cash come from their own pages. Change them there, and the ledger follows.", { act: "click" }),
  ] },
  "ledger-report": { title: "Make the transparency report", steps: [
    step(LEDGER, "tIn", "The totals: cash in, spent, turned over to beneficiaries, and what HoR still holds.", { zoom: 1.35 }),
    step(LEDGER, "addTurnover", "When you hand money or goods to a beneficiary, record it as a turnover with its proof.", { act: "click" }),
    step(LEDGER, "report", "Transparency report makes the summary for one event or all of them, with every line item, as a page or a PDF.", { act: "click" }),
  ] },
  "journey-add": { title: "Add a stop to the journey", steps: [
    step(JOURNEY, "fromEvent", "Press + Add from an event (its date follows the event), or + Add a milestone.", { act: "click" }),
    step(JOURNEY, "edit2", "New stops start as drafts. Open it to check the wording and add photos.", { act: "click" }),
    step(P(JOURNEY, { rows: [JOURNEY.rows[0], { ...JOURNEY.rows[1], chip: "On the website", tone: "good" }] }), "edit2", "Publish it, and it joins “Our journey” on the home page.", { build: true }),
  ] },
  "journey-layout": { title: "Show or hide the journey", steps: [
    step(JOURNEY, "show", "On the home page: switch the whole section on or off…", { act: "tick" }),
    step(JOURNEY, "show", "…and pick its layout, vertical or sideways, then Save.", { zoom: 1.2 }),
  ] },
  "breeds-change": { title: "Change a breed icon", steps: [
    step(BREEDS, "search", "Find the breed.", { act: "type", text: "Golden" }),
    step(BREEDS, "upload1", "Press Upload icon and pick the file. The page says the size and style that fit.", { act: "click" }),
    step(BREEDS, "builtin2", "Changed your mind? Use built-in puts the original back.", { act: "click" }),
  ] },
  "admins-invite": { title: "Invite an admin", steps: [
    step(ADMINS, "invite", "Press + Invite an admin.", { act: "click" }),
    step(P(ADMINS, { fields: [{ t: "email", label: "Their email", value: "" }, { t: "pages", label: "Page access", value: "Events: Edit · Check-in: Edit" }] }), "email", "Type the email they'll sign in with, and set which pages they can view or edit.", { act: "type", text: "shey@gmail.com" }),
    step(P(ADMINS, { confirm: { title: "Invite this admin?", note: "Only the pages you set show in their menu.", yes: "Yes, invite admin" } }), "confirm", "Confirm. They can sign in with that email.", { act: "click" }),
  ] },
  "admins-access": { title: "Change what someone can open", steps: [
    step(ADMINS, "roles2", "Edit roles gives a whole role, like Events or Check-in.", { act: "click" }),
    step(ADMINS, "access", "Or under Page access, set each page to hidden, View or Edit, then Save all.", { act: "click" }),
    step(ADMINS, "log", "The activity log shows every change, by whom and when.", { act: "click" }),
  ] },
  "profile-edit": { title: "Update your profile", steps: [
    step(PROFILE, "photo", "Add a photo. Without one, your initials show.", { act: "click" }),
    step(PROFILE, "furbaby", "Add your furbaby's name…", { act: "type", text: "Macchiato" }),
    step(P(PROFILE, { fields: [PROFILE.fields[0], { ...PROFILE.fields[1], value: "Macchiato" }] }), "showAs", "…and choose to show your name as “Shey / Macchiato”.", { act: "tick" }),
    step(P(PROFILE, { fields: [PROFILE.fields[0], { ...PROFILE.fields[1], value: "Macchiato" }], toggles: [{ t: "showAs", label: "Show my name as First name / furbaby", on: true }] }), "save", "Save. The menu and activity log show your new name.", { act: "click" }),
  ] },
});

/** Each page's guides, first one opens. Every admin who can open the page sees them. */
export const PAGE_GUIDES = {
  dashboard: ["dash-read", "events-create", "checkin-door"],
  events: ["events-create", "events-find", "event-prices"],
  eventEditor: ["event-edit", "event-prices", "events-create"],
  registrations: ["reg-index", "reg-check-payment", "reg-add"],
  checkin: ["checkin-door", "checkin-display"],
  people: ["people-follow", "people-email"],
  beneficiaries: ["benef-add", "benef-website", "benef-letter"],
  media: ["media-edit"],
  photographers: ["photog-add"],
  payments: ["pay-change"],
  ledger: ["ledger-expense", "ledger-fix", "ledger-report"],
  journey: ["journey-add", "journey-layout"],
  breeds: ["breeds-change"],
  admins: ["admins-invite", "admins-access"],
  profile: ["profile-edit"],
};
