import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";

export default function SupportModal({ onClose, onJoin }) {
  const dialog = useRef(null);
  const [method, setMethod] = useState("qr");
  const [qrMethod, setQrMethod] = useState("gcash");
  const [bankMethod, setBankMethod] = useState("bdo");
  const qrOptions = [['gcash','GCash','0912 345 6789','#007DFE','#FFFFFF'],['maya','Maya','QR code coming soon','#00E091','#0D0D0D'],['qrph','QRPh','QR code coming soon','#0067B1','#FFFFFF'],['bdo','BDO Pay','QR code coming soon','#003B70','#FFFFFF']];
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
        <div className="support-switch" role="tablist" aria-label="Donation methods">
          {[['qr','QR code'],['bank','Bank transfer'],['paymongo','PayMongo']].map(([id,label]) => <button type="button" key={id} role="tab" aria-selected={method === id} className={method === id ? 'active' : ''} onClick={() => setMethod(id)}>{label}</button>)}
        </div>
        <div className="support-method-detail">
          {method === 'qr' && <><div className="support-method-copy"><h3>Scan to give</h3><p>Choose a payment method to view its QR code.</p></div><div className="bank-panel" style={{ '--provider-color': selectedQr[3], '--provider-contrast': selectedQr[4] }}><div className="payment-tabs" role="tablist" aria-label="QR payment methods">{qrOptions.map(([id,label,,color,contrast]) => <button type="button" role="tab" aria-selected={qrMethod === id} className={qrMethod === id ? 'active' : ''} style={{ '--tab-color': color, '--tab-contrast': contrast }} key={id} onClick={() => setQrMethod(id)}>{label}</button>)}</div><div className="bank-account qr-account"><div className="qr-placeholder provider-qr" aria-label={`${selectedQr[1]} QR code coming soon`}><span>QR<br /><small>Coming soon</small></span></div><div className="account-details provider-details"><strong>{selectedQr[1]}</strong><span>{selectedQr[2]}</span><small>Account name</small><b>House of Retrievers PH</b></div></div></div></>}
          {method === 'bank' && <><div className="support-method-copy"><h3>Bank transfer</h3><p>Select a bank to view its transfer details.</p></div><div className="bank-panel"><div className="payment-tabs bank-tabs" role="tablist" aria-label="Bank transfer methods">{bankOptions.map(([id,label]) => <button type="button" role="tab" aria-selected={bankMethod === id} className={bankMethod === id ? 'active' : ''} key={id} onClick={() => setBankMethod(id)}>{label}</button>)}</div><div className="bank-account"><span className="bank-logo" aria-hidden="true">{selectedBank[1]}</span><div className="account-details"><strong>{selectedBank[1]}</strong><small>Account number</small><span>Coming soon</span><small>Account name</small><b>House of Retrievers PH</b></div></div></div></>}
          {method === 'paymongo' && <><span className="support-method-icon">↗</span><h3>PayMongo payment link</h3><p>PayMongo will be enabled after the organization account is approved. This keeps the prototype from accepting unconfigured payments.</p></>}
        </div>
        <div className="support-note"><strong>Want to sponsor an activity?</strong><button className="sponsor-cta" onClick={onJoin}>Talk to us <Icon name="arrow" size={15} /></button></div>
      </section>
    </div>
  );
}
