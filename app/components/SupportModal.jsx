import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";

export default function SupportModal({ onClose, onJoin }) {
  const dialog = useRef(null);
  const [method, setMethod] = useState("qr");
  const [qrMethod, setQrMethod] = useState("gcash");
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
          {method === 'qr' && <><div className="support-method-copy"><h3>Scan to give</h3><p>Choose a payment method to view its QR code.</p></div><div className="qr-placeholder" aria-label={`${qrMethod} QR code coming soon`}><span>QR<br /><small>Coming soon</small></span></div><div className="donation-details qr-method-tabs" role="tablist" aria-label="QR payment methods">{[['gcash','GCash','0912 345 6789'],['maya','Maya','QR code coming soon'],['qrph','QRPh','QR code coming soon'],['bdo','BDO','QR code coming soon']].map(([id,label,detail]) => <button type="button" role="tab" aria-selected={qrMethod === id} className={qrMethod === id ? 'active' : ''} key={id} onClick={() => setQrMethod(id)}><strong>{label}</strong><span>{detail}</span><small>House of Retrievers PH</small></button>)}</div></>}
          {method === 'bank' && <><span className="support-method-icon">₱</span><h3>Bank transfer</h3><div className="donation-details"><div><strong>BDO</strong><span>Account number coming soon</span><small>House of Retrievers PH</small></div><div><strong>UnionBank</strong><span>Account number coming soon</span><small>House of Retrievers PH</small></div></div><p>We’ll publish the verified account details here before accepting transfers.</p></>}
          {method === 'paymongo' && <><span className="support-method-icon">↗</span><h3>PayMongo payment link</h3><p>PayMongo will be enabled after the organization account is approved. This keeps the prototype from accepting unconfigured payments.</p></>}
        </div>
        <div className="support-note"><strong>Want to sponsor an activity?</strong><button className="sponsor-cta" onClick={onJoin}>Talk to us <Icon name="arrow" size={15} /></button></div>
      </section>
    </div>
  );
}
