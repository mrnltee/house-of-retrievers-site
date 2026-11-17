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
      { scene: "letters", target: "newName", act: "type", text: "Thank-you letter (sponsors)", caption: "On Letters, scroll to New letter and type a name. Only admins see it." },
      { scene: "letters", state: { newName: "Thank-you letter (sponsors)" }, target: "newLetter", act: "click", caption: "Press + New letter." },
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
      { scene: "guestTracker", target: "g1Status", caption: "Their reply stays No reply yet until you change it in Edit. When they answer, set Coming or Can't make it there." },
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
