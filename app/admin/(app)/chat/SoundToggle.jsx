"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { SOUND_EVENT, isMuted, setMuted } from "../chatSound";

/** The chat page's switch for the new-message chime; the same setting as the floating chat's bell. */
export default function SoundToggle() {
  const [muted, setState] = useState(false);
  useEffect(() => {
    setState(isMuted());
    const on = (e) => setState(Boolean(e.detail?.muted));
    window.addEventListener(SOUND_EVENT, on);
    return () => window.removeEventListener(SOUND_EVENT, on);
  }, []);
  return (
    <button type="button" className="btn ghost" title={muted ? "New messages are silent. Click to hear a soft chime." : "A soft chime plays for new messages. Click to mute."} onClick={() => { setMuted(!muted); setState(!muted); }}>
      {muted ? <BellOff size={16} aria-hidden="true" /> : <Bell size={16} aria-hidden="true" />} {muted ? "Sound off" : "Sound on"}
    </button>
  );
}
