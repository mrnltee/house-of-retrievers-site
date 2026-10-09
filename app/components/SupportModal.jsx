import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";

function formatUpdated(iso) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-PH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Manila" }).format(new Date(iso));
}

function CopyButton({ value, label }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="copy-button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(value.replace(/\s+/g, "")); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked: the value is on screen to copy by hand */ }
      }}
      aria-label={`Copy ${label}`}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/** Donation details an Owner approved in the admin. */
function LiveDetails({ methods }) {
  const [selected, setSelected] = useState(methods[0]?.key);
  const method = methods.find((m) => m.key === selected) || methods[0];
  if (!method) {
    return (
      <div className="support-method-detail live-empty">
        <div className="support-method-copy"><h3>Donation details are on their way</h3><p>We&apos;re setting up HOR&apos;s official accounts. Message us on Instagram or Facebook if you&apos;d like to give before then.</p></div>
      </div>
    );
  }
  const d = method.details;
  const rows = [
    d.bankName && ["Bank", d.bankName],
    d.number && ["Number", d.number],
    d.accountNumber && ["Account number", d.accountNumber],
    d.accountName && ["Account name", d.accountName],
  ].filter(Boolean);
  return (
    <div className="support-method-detail live-details">
      {methods.length > 1 && (
        <div className="payment-tabs" role="group" aria-label="Donation methods">
          {methods.map((m) => <button type="button" key={m.key} aria-pressed={m.key === method.key} className={m.key === method.key ? "active" : ""} onClick={() => setSelected(m.key)}>{m.label}</button>)}
        </div>
      )}
      <div className="live-account">
        {method.qrImage && <img className="live-qr" src={method.qrImage} alt={`${method.label} QR code for House of Retrievers`} width="160" height="160" />}
        <div className="account-details">
          <strong>{method.label}</strong>
          {rows.map(([label, value]) => (
            <div key={label} className="live-row"><small>{label}</small><span>{value}{label !== "Account name" && label !== "Bank" && <CopyButton value={value} label={label.toLowerCase()} />}</span></div>
          ))}
          {method.updatedAt && <p className="live-updated">Details updated {formatUpdated(method.updatedAt)}. Always check the account name before you send.</p>}
        </div>
      </div>
    </div>
  );
}

export default function SupportModal({ onClose, onJoin }) {
  const dialog = useRef(null);
  const [live, setLive] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/support-details", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => { if (!cancelled) setLive(data); })
      .catch(() => { if (!cancelled) setLive({ configured: false }); });
    return () => { cancelled = true; };
  }, []);
  const [method, setMethod] = useState("qr");
  const [qrMethod, setQrMethod] = useState("gcash");
  const [bankMethod, setBankMethod] = useState("bdo");
  const [demoAmount, setDemoAmount] = useState("500");
  const [demoName, setDemoName] = useState("");
  const [demoPayment, setDemoPayment] = useState("GCash");
  const [demoComplete, setDemoComplete] = useState(false);
  const qrOptions = [['gcash','GCash','09XX XXX XXXX','#007DFE','#0D0D0D'],['maya','Maya','QR code coming soon','#00E091','#0D0D0D'],['qrph','QRPh','QR code coming soon','#0067B1','#FFFFFF'],['bdo','BDO Pay','QR code coming soon','#003B70','#FFFFFF']];
  const bankOptions = [['bdo','BDO'],['unionbank','UnionBank']];
  const selectedQr = qrOptions.find(([id]) => id === qrMethod);
  const selectedBank = bankOptions.find(([id]) => id === bankMethod);
  useEffect(() => {
    const opener = document.activeElement;
    const node = dialog.current;
    node.querySelector("button")?.focus();
    const trap = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const items = [...node.querySelectorAll("button, a[href]")].filter((item) => item.getClientRects().length);
      if (!items.length) return;
      const first = items[0]; const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", trap);
    return () => { document.removeEventListener("keydown", trap); opener?.focus?.(); };
  }, [onClose]);
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialog} className="support-modal" role="dialog" aria-modal="true" aria-labelledby="support-title">
        <button className="modal-close" onClick={onClose} aria-label="Close support options"><Icon name="close" /></button>
        <div className="eyebrow">Support the pack</div>
        <h2 id="support-title">Help us make<br /><em>more good.</em></h2>
        <p className="modal-lead">Every contribution helps us show up for dogs, people, and the communities we share.</p>
        {live === null ? <div className="support-method-detail" aria-busy="true"><p className="support-method-copy">Loading donation details…</p></div> : live.configured ? <LiveDetails methods={live.methods || []} /> : <>
        <div className="support-switch" role="group" aria-label="Donation methods">
          {[['qr','QR code'],['bank','Bank transfer'],['paymongo','PayMongo']].map(([id,label]) => <button type="button" key={id} aria-pressed={method === id} className={method === id ? 'active' : ''} onClick={() => setMethod(id)}>{label}</button>)}
        </div>
        <div className="support-method-detail">
          {method === 'qr' && <><div className="support-method-copy"><h3>Scan to give</h3><p>Choose a payment method to view its QR code.</p></div><div className="bank-panel" style={{ '--provider-color': selectedQr[3], '--provider-contrast': selectedQr[4] }}><div className="payment-tabs" role="group" aria-label="QR payment methods">{qrOptions.map(([id,label,,color,contrast]) => <button type="button" aria-pressed={qrMethod === id} className={qrMethod === id ? 'active' : ''} style={{ '--tab-color': color, '--tab-contrast': contrast }} key={id} onClick={() => setQrMethod(id)}>{label}</button>)}</div><div className="bank-account qr-account"><div className="qr-placeholder provider-qr" aria-label={`${selectedQr[1]} QR code coming soon`}><span>QR<br /><small>Coming soon</small></span></div><div className="account-details provider-details"><strong>{selectedQr[1]}</strong><span>{selectedQr[2]}</span><small>Account name</small><b>House of Retrievers PH</b></div></div></div></>}
          {method === 'bank' && <><div className="support-method-copy"><h3>Bank transfer</h3><p>Select a bank to view its transfer details.</p></div><div className="bank-panel"><div className="payment-tabs bank-tabs" role="group" aria-label="Bank transfer methods">{bankOptions.map(([id,label]) => <button type="button" aria-pressed={bankMethod === id} className={bankMethod === id ? 'active' : ''} key={id} onClick={() => setBankMethod(id)}>{label}</button>)}</div><div className="bank-account"><span className="bank-logo" aria-hidden="true">{selectedBank[1]}</span><div className="account-details"><strong>{selectedBank[1]}</strong><small>Account number</small><span>Coming soon</span><small>Account name</small><b>House of Retrievers PH</b></div></div></div></>}
          {method === 'paymongo' && <div className="paymongo-demo">{demoComplete ? <div className="demo-success" role="status"><span><Icon name="check" size={24} /></span><div><small>Demo complete</small><h3>Donation preview ready</h3><p>No payment was processed and none of the information was saved.</p></div><button type="button" onClick={() => setDemoComplete(false)}>Try again</button></div> : <><div className="support-method-copy"><span className="demo-badge">Interactive demo · No real payment</span><h3>Preview a PayMongo donation</h3><p>See how a donor could choose an amount and continue to secure checkout.</p></div><form className="paymongo-form" onSubmit={(event) => { event.preventDefault(); setDemoComplete(true); }}><fieldset><legend>Donation amount</legend><div className="amount-options">{['250','500','1000'].map((amount) => <button type="button" aria-pressed={demoAmount === amount} className={demoAmount === amount ? 'active' : ''} key={amount} onClick={() => setDemoAmount(amount)}>₱{Number(amount).toLocaleString()}</button>)}</div><label className="custom-amount"><span>Custom amount</span><div><b>₱</b><input required min="1" inputMode="numeric" type="number" value={demoAmount} onChange={(event) => setDemoAmount(event.target.value)} /></div></label></fieldset><label><span>Donor name <small>(optional)</small></span><input type="text" value={demoName} onChange={(event) => setDemoName(event.target.value)} placeholder="Any demo name" /></label><fieldset><legend>Payment method</legend><div className="demo-payment-options">{['GCash','Card','QRPh'].map((payment) => <label className={demoPayment === payment ? 'active' : ''} key={payment}><input type="radio" name="demoPayment" checked={demoPayment === payment} onChange={() => setDemoPayment(payment)} /><span>{payment}</span></label>)}</div></fieldset><button className="demo-submit" type="submit">Preview ₱{Number(demoAmount || 0).toLocaleString()} donation <Icon name="arrow" size={16} /></button><small className="demo-privacy">Demo only. This form makes no network request and stores no data.</small></form></>}</div>}
        </div>
        </>}
        <div className="support-note"><strong>Want to sponsor an activity?</strong><button className="sponsor-cta" onClick={onJoin}>Talk to us <Icon name="arrow" size={15} /></button></div>
      </section>
    </div>
  );
}
