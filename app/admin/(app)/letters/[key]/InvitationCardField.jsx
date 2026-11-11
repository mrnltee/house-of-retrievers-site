"use client";

import { useEffect, useState } from "react";
import ImageField from "../../ImageField";
import { INVITATION_LIMITS, MAX_INVITATION_PAGES } from "../../../../lib/invitationCard.mjs";
import { SliderField } from "./LetterEditor";

const PAGE_HINTS = ["e.g. the Attire guide", "e.g. A Celebration with Purpose (beneficiaries)", "Optional"];

/** The invitation settings to post for a preview: saved pictures kept, new ones sent alongside. */
export function invitationPostFields(inv) {
  return {
    invitation: JSON.stringify({ on: inv.on, card: inv.card, pages: inv.pages.filter((p, i) => p && !inv.pageUploads[i]), y: inv.y, nameSize: inv.nameSize, orgSize: inv.orgSize, audience: inv.audience }),
    inviteCardUpload: inv.cardUpload,
    invitePageUploads: inv.pageUploads.filter(Boolean),
  };
}

/**
 * The invitation card settings (owner, 2026-11-11): the blank card, up to
 * three more pages, and where the guest's name goes, with the card as the
 * server draws it for a sample guest (refreshed as settings change).
 */
export default function InvitationCardField({ inv, setInv, letterKey, action, onPreview }) {
  const [state, setState] = useState({ src: "", error: "", busy: false });
  const hasCard = Boolean(inv.cardUpload || inv.card);

  // Draws the sample card on the server, a moment after the last change.
  useEffect(() => {
    if (!inv.on || !hasCard) { setState({ src: "", error: "", busy: false }); onPreview?.(""); return undefined; }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setState((s) => ({ ...s, busy: true }));
      const body = new FormData();
      body.set("letter", letterKey);
      body.set("format", "card");
      const fields = invitationPostFields(inv);
      body.set("invitation", fields.invitation);
      body.set("inviteCardUpload", fields.inviteCardUpload);
      try {
        const response = await fetch(action, { method: "POST", body, signal: controller.signal });
        if (!response.ok) throw new Error(await response.text());
        const blob = await response.blob();
        const src = await new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsDataURL(blob); });
        setState({ src, error: "", busy: false });
        onPreview?.(src);
      } catch (error) {
        if (error.name !== "AbortError") setState({ src: "", error: String(error.message || "The preview couldn't be made."), busy: false });
      }
    }, 400);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [inv.on, inv.card, inv.cardUpload, inv.y, inv.nameSize, inv.orgSize, inv.audience, letterKey, action, hasCard]); // eslint-disable-line react-hooks/exhaustive-deps

  const setPage = (i) => (url) => setInv((s) => {
    const pageUploads = [...s.pageUploads];
    const pages = [...s.pages];
    pageUploads[i] = url;
    if (!url) pages[i] = "";
    return { ...s, pageUploads, pages };
  });

  return (
    <div className="signature-controls invitation-controls">
      <input type="hidden" name="invitationOn" value={inv.on ? "1" : ""} />
      <input type="hidden" name="invitationAudience" value={inv.audience} />
      <input type="hidden" name="invitationY" value={inv.y} />
      <input type="hidden" name="invitationNameSize" value={inv.nameSize} />
      <input type="hidden" name="invitationOrgSize" value={inv.orgSize} />
      <div hidden={!inv.on} className="signature-controls">
        <ImageField name="inviteCard" label="Card" hint="The invitation without a name, 4:5 (e.g. 1080 × 1350). Each guest's name is written on it." current={inv.card} maxEdge={1350} onChange={(url) => setInv((s) => ({ ...s, cardUpload: url, card: url ? s.card : "" }))} />
        <SliderField label="Name up ↕ down" hint="Where the name sits on the card" unit="%" min={INVITATION_LIMITS.y[0] * 100} max={INVITATION_LIMITS.y[1] * 100} step={0.5} value={Math.round(inv.y * 1000) / 10} onChange={(v) => setInv((s) => ({ ...s, y: v / 100 }))} />
        <SliderField label="Name size" hint="Height of the cursive name" unit="px" min={INVITATION_LIMITS.nameSize[0]} max={INVITATION_LIMITS.nameSize[1]} step={1} value={inv.nameSize} onChange={(v) => setInv((s) => ({ ...s, nameSize: v }))} />
        <SliderField label="Organization size" hint="The line under the name" unit="px" min={INVITATION_LIMITS.orgSize[0]} max={INVITATION_LIMITS.orgSize[1]} step={1} value={inv.orgSize} onChange={(v) => setInv((s) => ({ ...s, orgSize: v }))} />
        <div className="invitation-card-preview" aria-live="polite">
          {state.src ? <img src={state.src} alt={inv.audience === "participants" ? "The card as a participant gets it, for the sample participant Jessie Mae Gabriel" : "The card as a guest gets it, for the sample guest Ms. Malou Perez"} /> : <p className="small muted">{state.error || (hasCard ? "Drawing the card…" : "Upload the card to see it with a guest's name.")}</p>}
          {state.busy && state.src && <span className="small muted">Updating…</span>}
        </div>
        <span className="field-head">Pages after the card <small>In the PDF only, in this order. 4:5 like the card.</small></span>
        {Array.from({ length: MAX_INVITATION_PAGES }, (_, i) => (
          <ImageField key={i} name={`invitePage${i}`} label={`Page ${i + 2}`} hint={PAGE_HINTS[i]} current={inv.pages[i] || ""} maxEdge={1350} onChange={setPage(i)} />
        ))}
      </div>
    </div>
  );
}
