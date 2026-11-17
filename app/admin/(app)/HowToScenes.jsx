import Icon from "../../components/Icon";
/**
 * The simplified screens the How it works guides play on (owner, 2026-11-15).
 * Pictures only: they're hidden from screen readers (the steps are read as a
 * list instead) and nothing in them can be focused or pressed. Each place the
 * pointer can go has a `data-t` name, listed in SCENE_TARGETS (howToGuides.mjs).
 */

const T = (name) => ({ "data-t": name });
const Box = ({ on }) => <span className={`ht-box${on ? " is-on" : ""}`}>{on ? <Icon name="check" /> : null}</span>;
const Btn = ({ t, tone = "", children }) => <span className={`ht-btn ${tone}`.trim()} {...T(t)}>{children}</span>;

function Tracker({ state = {} }) {
  const ticked = state.ticked || [];
  const sent = (row) => (state.sent || []).includes(row);
  const rows = [
    { id: "row1", name: "Acuaverde", contact: "Kristine", when: "Sent Nov 2" },
    { id: "row2", name: "Aeternal Paws", contact: "Korene", when: "Sent Nov 2" },
  ];
  return (
    <div className="ht-screen">
      <div className="ht-head">
        <strong className="ht-title">Brand tracker</strong>
        <span className="ht-actions"><Btn t="followAll">Follow up · 3</Btn><Btn t="invite" tone="gold">+ Invite brands</Btn></span>
      </div>
      <div className={`ht-bar${ticked.length ? " is-on" : ""}`}>
        {ticked.length ? <><strong>{ticked.length} selected</strong><Btn t="review" tone="dark">Review &amp; send</Btn></> : <span>Tick brands to send one letter to several at once.<span {...T("review")} /></span>}
      </div>
      <div className="ht-table">
        {rows.map((r) => (
          <div className="ht-row" key={r.id}>
            <span {...T(`${r.id}Tick`)}><Box on={ticked.includes(r.id)} /></span>
            <span className="ht-name"><strong>{r.name}</strong><small>as Sponsor</small></span>
            <span className="ht-cell"><span className="ht-chip">Sent</span><small>{sent(r.id) ? "Sent just now" : r.when}</small>
              <span className="ht-actions">{r.id === "row1" && <Btn t="row1Follow" tone="dark">Follow up</Btn>}<Btn t={`${r.id}Send`}>Send letter</Btn></span>
            </span>
            <span className="ht-chip">No reply yet</span>
          </div>
        ))}
        <div className={`ht-row${state.added ? " is-new" : " is-hidden"}`} {...T("newRow")}>
          <span><Box /></span>
          <span className="ht-name"><strong>{state.newName || "Pawfect Bakes"}</strong><small>as Sponsor</small></span>
          <span className="ht-cell"><small>No invite sent yet</small><span className="ht-actions"><Btn t="newSend">Send letter</Btn></span></span>
          <span className="ht-chip">No reply yet</span>
        </div>
      </div>
    </div>
  );
}

/** An event's Guest tracker (owner, 2026-11-17): Invite / Follow up / Message per guest, ticks for several. */
function GuestTracker({ state = {} }) {
  const ticked = state.ticked || [];
  const sent = (row) => (state.sent || []).includes(row);
  const rows = [
    { id: "g1", name: "Ms. Malou Perez", role: "VIP furparents", invited: true },
    { id: "g2", name: "Ramon Bautista", role: "Media & press", invited: false },
  ];
  return (
    <div className="ht-screen">
      <div className="ht-head">
        <strong className="ht-title">Guest tracker</strong>
        <span className="ht-actions"><Btn t="followAll">Follow up · 1</Btn><Btn t="add" tone="gold">+ Add a guest</Btn></span>
      </div>
      <div className={`ht-bar${ticked.length ? " is-on" : ""}`}>
        {ticked.length
          ? <><strong>{ticked.length} selected</strong><span className="ht-actions"><Btn t="review" tone="dark">Review &amp; send</Btn><Btn t="messageMany">Send a message</Btn></span></>
          : <span>Tick guests to send one letter or message to several at once.<span {...T("review")} /><span {...T("messageMany")} /></span>}
      </div>
      <div className="ht-table">
        {rows.map((r) => {
          const invited = r.invited || sent(r.id);
          return (
            <div className="ht-row" key={r.id}>
              <span {...T(`${r.id}Tick`)}><Box on={ticked.includes(r.id)} /></span>
              <span className="ht-name"><strong>{r.name}</strong><small>{r.role}</small></span>
              <span className="ht-cell" {...T(`${r.id}Status`)}>
                {invited ? <><span className="ht-chip">Sent</span><small>{sent(r.id) ? "Sent just now" : "Sent Nov 10"}</small></> : <small>No invite sent yet</small>}
                <span className="ht-actions">
                  {r.invited && <Btn t={`${r.id}Follow`} tone="dark">Follow up</Btn>}
                  <Btn t={`${r.id}Invite`} tone={invited ? "" : "dark"}>{invited ? "Invite again" : "Invite"}</Btn>
                  <Btn t={`${r.id}Message`}>Message</Btn>
                </span>
              </span>
              <span className="ht-chip">No reply yet</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({ t, label, value, placeholder, multiline = false }) {
  return (
    <span className="ht-field" {...T(t)}>
      <small>{label}</small>
      <span className={`ht-input${multiline ? " is-tall" : ""}${value ? "" : " is-empty"}`}>{value || placeholder}{value !== undefined && <span className="ht-caret" />}</span>
    </span>
  );
}

function Invite({ state = {}, typed }) {
  const query = typed?.target === "search" ? typed.text : state.query || "";
  const picked = state.picked || [];
  return (
    <div className="ht-screen ht-dim">
      <div className="ht-dialog">
        <div className="ht-head"><strong className="ht-title">Invite brands</strong><span className="ht-btn">Close</span></div>
        <Field t="search" label="Search the directory" value={query || undefined} placeholder="Search the directory…" />
        {state.empty ? (
          <div className="ht-empty">
            <small>No brand called “{query}” in the directory.</small>
            <Btn t="addNew" tone="gold">Add “{query}” as a new brand</Btn>
          </div>
        ) : (
          <>
            <div className="ht-list">
              <span className="ht-pick" {...T("pick1")}><Box on={picked.includes("pick1")} /> Pawfect Bakes <small>· usually Sponsor</small></span>
              <span className="ht-pick" {...T("pick2")}><Box on={picked.includes("pick2")} /> Paws &amp; Claws Café <small>· usually Partner</small></span>
            </div>
            <Btn t="add" tone="dark">Add to this event</Btn>
            <span {...T("addNew")} />
          </>
        )}
      </div>
    </div>
  );
}

function Send({ state = {}, typed }) {
  const blank = typed?.target === "blank" ? typed.text : state.typedBlank;
  const to = state.to || [];
  const people = state.guests
    ? [{ t: "to1", tab: "tab1", name: "Ms. Malou Perez", dear: "Ms. Perez" }, { t: "to2", tab: "tab2", name: "Ramon Bautista", dear: "Mr. Bautista" }]
    : [{ t: "to1", tab: "tab1", name: "Acuaverde" }, { t: "to2", tab: "tab2", name: "Aeternal Paws" }];
  const shown = people.filter((p) => to.includes(p.t));
  return (
    <div className="ht-screen ht-dim">
      <div className="ht-dialog is-wide">
        <div className="ht-head"><strong className="ht-title">Send a letter</strong><span className="ht-btn"><Icon name="close" /> Close</span></div>
        <div className="ht-cols">
          <div className="ht-col">
            <span className="ht-field" {...T("letter")}><small>Letter</small><span className="ht-input">{state.own ? "Your own email" : state.letter || "Sponsorship letter — Golden Beginning"} ▾</span></span>
            <small className="ht-legend">Send to · {to.length} ticked</small>
            {people.map((p) => <span key={p.t} className="ht-pick" {...T(p.t)}><Box on={to.includes(p.t)} /> {p.name}</span>)}
            {state.blank ? <Field t="blank" label="Fill in for this send · [Reply By Date]" value={blank} placeholder="e.g. December 5" /> : <span {...T("blank")} />}
            <span className="ht-pick" {...T("own")}><Box on={state.own} /> Write my own email (email only)</span>
            <Btn t="send" tone="gold">Send to {to.length}</Btn>
          </div>
          <div className="ht-col ht-preview">
            <small>Preview for</small>
            <span className="ht-tabs">{shown.map((p, i) => <span key={p.tab} className={`ht-tab${i === 0 ? " is-on" : ""}`} {...T(p.tab)}>{p.name}</span>)}</span>
            {people.filter((p) => !to.includes(p.t)).map((p) => <span key={p.tab} {...T(p.tab)} />)}
            <Btn t="write"><><Icon name="edit" /> {state.own ? "Write your email" : "Edit wording for this send"}</></Btn>
            <span className="ht-mail">
              <strong>Dear {shown[0] ? (shown[0].dear || `${shown[0].name} Team`) : "…"},</strong>
              {state.own ? <span>{state.ownText || "It was lovely meeting your team today."}</span> : <><span className="ht-line" /><span className="ht-line" /><span className="ht-line is-short" /></>}
              <small>With love and purpose</small>
            </span>
          </div>
        </div>
        {state.confirm && (
          <div className="ht-confirm">
            <strong>Send to 1 recipient?</strong>
            <small>Each gets an email addressed to them by name.</small>
            <Btn t="confirm" tone="dark">Yes, send letters</Btn>
          </div>
        )}
        {!state.confirm && <span {...T("confirm")} />}
      </div>
    </div>
  );
}

function Editor({ state = {}, typed }) {
  const subject = typed?.target === "subject" ? typed.text : state.subject;
  const message = typed?.target === "message" ? typed.text : state.message;
  return (
    <div className="ht-screen ht-dim">
      <div className="ht-dialog">
        <strong className="ht-title">Write your email</strong>
        <Field t="subject" label="Email subject" value={subject} placeholder="Write your subject here" />
        <span className="ht-field" {...T("message")}>
          <small>Message</small>
          <span className="ht-input is-tall">Dear [Salutation],<br /><br /><span className={message ? "" : "ht-placeholder"}>{message || "Write your message here."}</span>{message !== undefined && <span className="ht-caret" />}</span>
        </span>
        <Btn t="use" tone="dark">Use this wording</Btn>
      </div>
    </div>
  );
}

function BrandForm() {
  return (
    <div className="ht-screen ht-dim">
      <div className="ht-dialog">
        <div className="ht-head"><strong className="ht-title">Add a brand</strong><span className="ht-btn"><Icon name="close" /> Close</span></div>
        <Field t="name" label="Name" value="Pawsome Treats" />
        <span className="ht-field-row">
          <span className="ht-field" {...T("kind")}><small>Type</small><span className="ht-seg"><span className="is-on">Sponsor</span><span>Partner</span></span></span>
          <span className="ht-field" {...T("code")}><small>4-letter code</small><span className="ht-input">PAWS</span></span>
        </span>
        <span className="ht-field" {...T("event")}><small>Add to events</small><span className="ht-pick"><Box on /> Golden Beginning · Nov 30</span></span>
        <Btn t="create" tone="dark">Create</Btn>
      </div>
    </div>
  );
}

/** A confirm dialog over a scene (state.confirm = its title). */
function Confirm({ title }) {
  return title ? (
    <div className="ht-screen ht-dim">
      <div className="ht-dialog ht-small">
        <strong>{title}</strong>
        <small>Nothing is sent.</small>
        <Btn t="confirm" tone="dark">Yes</Btn>
      </div>
    </div>
  ) : null;
}

function Letters({ state = {}, typed }) {
  const name = typed?.target === "newName" ? typed.text : state.newName;
  return (
    <div className="ht-screen">
      <div className="ht-head"><strong className="ht-title">Letters</strong><Btn t="details">Standard details (6)</Btn></div>
      <div className="ht-row ht-row-2">
        <span className="ht-name"><strong>Sponsorship letter (brands and companies)</strong><small>Sent to: Sponsors · 2 blanks to fill when sending</small></span>
        <span className="ht-actions"><Btn t="edit1">Edit</Btn><Btn t="dup1">Duplicate</Btn></span>
      </div>
      <div className="ht-row ht-row-2">
        <span className="ht-name"><strong>Invitation: special guests</strong><small>Sent to: VIP furparents · Nothing to type when sending</small></span>
        <span className="ht-actions"><Btn>Edit</Btn><Btn>Duplicate</Btn></span>
      </div>
      <div className="ht-card">
        <strong>New letter</strong>
        <span className="ht-field-row is-end"><Field t="newName" label="Name · only admins see this" value={name} placeholder="e.g. Thank-you letter (sponsors)" /><Btn t="newLetter" tone="dark">+ New letter</Btn></span>
      </div>
      <div className="ht-card" {...T("group")}><strong>Which letter each group gets</strong><small>Sponsors → Sponsorship letter · Media → Invitation: media</small></div>
      <Confirm title={state.confirm} />
      {!state.confirm && <span {...T("confirm")} />}
    </div>
  );
}

function LetterEditor({ state = {}, typed }) {
  const subject = typed?.target === "subject" ? typed.text : state.subject;
  return (
    <div className="ht-screen">
      <div className="ht-cols">
        <div className="ht-col">
          <small className="ht-legend"><strong>1</strong> Name and subject</small>
          <span className="ht-field-row">
            <Field t="name" label="Name" value={state.name || "Thank-you letter (sponsors)"} />
            <Field t="subject" label="Email subject" value={subject} placeholder="The line people see in their inbox" />
          </span>
          <small className="ht-legend"><strong>2</strong> Covering email</small>
          <span className="ht-input" {...T("cover")}>Dear [Salutation], our letter is attached.</span>
          <small className="ht-legend"><strong>3</strong> The letter (PDF)</small>
          <span className="ht-tools"><span className="ht-tool" {...T("bold")}><b>B</b></span><span className="ht-tool">H1</span><span className="ht-tool">≡</span><span className="ht-tool">•</span><span className="ht-tool" {...T("blankBtn")}>[ ] Blank</span></span>
          <span className="ht-input is-tall" {...T("body")}>[Date] · [Company Name]<br />Dear [Salutation]:<br />Thank you for being part of…</span>
          <span className="ht-actions"><Btn t="save" tone="dark">Save</Btn></span>
        </div>
        <div className="ht-col ht-preview">
          <small>Preview, addressed to a sample brand</small>
          <span className="ht-page"><span className="ht-line is-short" /><span className="ht-line" /><span className="ht-line" /><span className="ht-line is-short" /><span className="ht-line" /></span>
          <Btn t="preview">Preview PDF</Btn>
        </div>
      </div>
      <Confirm title={state.confirm} />
      {!state.confirm && <span {...T("confirm")} />}
    </div>
  );
}

function Details({ state = {}, typed }) {
  const v1 = typed?.target === "field1" ? typed.text : state.field1;
  return (
    <div className="ht-screen">
      <strong className="ht-title">Standard details</strong>
      <small className="ht-legend">Filled in by themselves in every letter.</small>
      <Field t="field1" label="[Signatory Name]" value={v1} placeholder="Who signs the letters" />
      <span className="ht-field" {...T("field2")}><small>[HOR Bank] · from Payment settings</small><span className="ht-input is-empty">BPI · filled in from Payment settings</span></span>
      <Field label="[Contact Person]" value="Shey · 0917 •••• 123" />
      <Btn t="save" tone="dark">Save</Btn>
    </div>
  );
}

function People({ state = {} }) {
  const ticked = state.ticked || [];
  const rows = [{ t: "tick1", name: "Ms. Malou Perez", sub: "VIP furparent" }, { t: "tick2", name: "Pawssion Project", sub: "Beneficiary · rescue" }];
  return (
    <div className="ht-screen">
      <div className="ht-head"><strong className="ht-title">Guest list</strong></div>
      <div className="ht-card ht-group">
        <span className="ht-head"><strong>VIP furparents · Invitation: special guests</strong><Btn t="send" tone="dark">Send this letter to ticked</Btn></span>
        {rows.map((r) => <span key={r.t} className="ht-pick" {...T(r.t)}><Box on={ticked.includes(r.t)} /> <strong>{r.name}</strong> <small>· {r.sub}</small></span>)}
      </div>
    </div>
  );
}

function Templates() {
  return (
    <div className="ht-screen">
      <strong className="ht-title">Email templates</strong>
      <small className="ht-legend">Sent automatically</small>
      <div className="ht-row ht-row-2"><span className="ht-name"><strong>RSVP confirmed (standard)</strong><small>Sent when a spot is confirmed</small></span><span className="ht-actions"><Btn t="edit1">Edit</Btn></span></div>
      <small className="ht-legend">Your templates</small>
      <span className="ht-actions"><Btn t="newAcceptance">+ New acceptance template</Btn><Btn t="newEvent">+ New event confirmation template</Btn></span>
    </div>
  );
}

function TemplateEditor({ state = {}, typed }) {
  const val = (key) => (typed?.target === key ? typed.text : state[key]);
  return (
    <div className="ht-screen">
      <div className="ht-cols">
        <div className="ht-col">
          <Field t="tname" label="Template name" value={val("tname")} placeholder="e.g. Volunteer accepted" />
          <Field t="subject" label="Subject" value={val("subject")} placeholder="The line people see in their inbox" />
          <Field t="heading" label="Heading" value={state.subject ? "You're in!" : undefined} placeholder="The big serif line" />
          <span className="ht-field" {...T("message")}><small>Message</small><span className="ht-input is-tall">Hi {state.chip ? <b>{"{{first_name}}"}</b> : "…"}, welcome to the House of Retrievers family…</span></span>
          <span className="ht-actions"><span className="ht-chip" {...T("chip")}>{"{{first_name}}"}</span><span className="ht-chip">{"{{furbaby_name}}"}</span></span>
          <span className="ht-actions"><Btn t="save" tone="dark">Save</Btn><Btn t="test">Send a test to me</Btn></span>
        </div>
        <div className="ht-col ht-preview">
          <small>Preview</small>
          <span className="ht-mail"><strong>{state.chip ? "Hi Shey," : "Hi …,"}</strong><span className="ht-title">You&apos;re in!</span><span className="ht-line" /><span className="ht-line is-short" /><small>With love and purpose</small></span>
        </div>
      </div>
    </div>
  );
}

const SCENES = { tracker: Tracker, guestTracker: GuestTracker, invite: Invite, send: Send, editor: Editor, brandForm: BrandForm, letters: Letters, letterEditor: LetterEditor, details: Details, people: People, templates: Templates, templateEditor: TemplateEditor };

/** One guide step's screen. `typed` is the text typed so far on a typing step. */
export default function HowToScene({ scene, state, typed }) {
  const Scene = SCENES[scene] || Tracker;
  return <Scene state={state} typed={typed} />;
}
