/**
 * The simplified screens the How it works guides play on (owner, 2026-11-15).
 * Pictures only: they're hidden from screen readers (the steps are read as a
 * list instead) and nothing in them can be focused or pressed. Each place the
 * pointer can go has a `data-t` name, listed in SCENE_TARGETS (howToGuides.mjs).
 */

const T = (name) => ({ "data-t": name });
const Box = ({ on }) => <span className={`ht-box${on ? " is-on" : ""}`}>{on ? "✓" : ""}</span>;
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

function Send({ state = {} }) {
  const to = state.to || [];
  const people = [{ t: "to1", tab: "tab1", name: "Acuaverde" }, { t: "to2", tab: "tab2", name: "Aeternal Paws" }];
  const shown = people.filter((p) => to.includes(p.t));
  return (
    <div className="ht-screen ht-dim">
      <div className="ht-dialog is-wide">
        <div className="ht-head"><strong className="ht-title">Send a letter</strong><span className="ht-btn">✕ Close</span></div>
        <div className="ht-cols">
          <div className="ht-col">
            <span className="ht-field" {...T("letter")}><small>Letter</small><span className="ht-input">{state.own ? "Your own email" : state.letter || "Sponsorship letter — Golden Beginning"} ▾</span></span>
            <small className="ht-legend">Send to · {to.length} ticked</small>
            {people.map((p) => <span key={p.t} className="ht-pick" {...T(p.t)}><Box on={to.includes(p.t)} /> {p.name}</span>)}
            <span className="ht-pick" {...T("own")}><Box on={state.own} /> Write my own email (email only)</span>
            <Btn t="send" tone="gold">Send to {to.length}</Btn>
          </div>
          <div className="ht-col ht-preview">
            <small>Preview for</small>
            <span className="ht-tabs">{shown.map((p, i) => <span key={p.tab} className={`ht-tab${i === 0 ? " is-on" : ""}`} {...T(p.tab)}>{p.name}</span>)}</span>
            {people.filter((p) => !to.includes(p.t)).map((p) => <span key={p.tab} {...T(p.tab)} />)}
            <Btn t="write">{state.own ? "✎ Write your email" : "✎ Edit wording for this send"}</Btn>
            <span className="ht-mail">
              <strong>Dear {shown[0]?.name || "…"} Team,</strong>
              {state.own ? <span>It was lovely meeting your team today.</span> : <><span className="ht-line" /><span className="ht-line" /><span className="ht-line is-short" /></>}
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
        <div className="ht-head"><strong className="ht-title">Add a brand</strong><span className="ht-btn">✕ Close</span></div>
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

const SCENES = { tracker: Tracker, invite: Invite, send: Send, editor: Editor, brandForm: BrandForm };

/** One guide step's screen. `typed` is the text typed so far on a typing step. */
export default function HowToScene({ scene, state, typed }) {
  const Scene = SCENES[scene] || Tracker;
  return <Scene state={state} typed={typed} />;
}
