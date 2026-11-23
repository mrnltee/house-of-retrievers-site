"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Smile } from "lucide-react";
import { CHAT_EMOJI } from "../../../lib/admin/chatEmoji.mjs";

/**
 * Preset emoji for the chat's message box (owner, 23 Nov 2026): a smiley button beside the box opens a small
 * grid above it. Picking one puts it at the cursor and closes the grid, back in the box. Arrow keys move
 * around the grid; Esc or a click outside closes it.
 */
export default function EmojiPicker({ onPick, disabled = false }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const toggle = useRef(null);
  const gridId = useId();
  const flat = CHAT_EMOJI.flatMap((g) => g.items);

  useEffect(() => {
    if (!open) return undefined;
    wrap.current?.querySelector(".emoji-opt")?.focus();
    const away = (e) => { if (!wrap.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("pointerdown", away, true);
    return () => document.removeEventListener("pointerdown", away, true);
  }, [open]);

  const close = () => { setOpen(false); toggle.current?.focus(); };

  const onKey = (e) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); return; }
    const buttons = [...wrap.current.querySelectorAll(".emoji-opt")];
    const i = buttons.indexOf(document.activeElement);
    if (i < 0) return;
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 8, ArrowUp: -8, Home: -i, End: buttons.length - 1 - i }[e.key];
    if (step === undefined) return;
    e.preventDefault();
    buttons[Math.max(0, Math.min(buttons.length - 1, i + step))]?.focus();
  };

  return (
    <div className="emoji-picker" ref={wrap} onKeyDown={onKey}>
      <button
        ref={toggle}
        type="button"
        className="emoji-toggle"
        aria-label="Add an emoji"
        title="Add an emoji"
        aria-expanded={open}
        aria-controls={gridId}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        <Smile size={22} aria-hidden="true" />
      </button>
      <div id={gridId} className="emoji-pop" role="group" aria-label="Emoji" hidden={!open}>
        {CHAT_EMOJI.map((g) => (
          <div key={g.group} className="emoji-group">
            <p className="emoji-group-name">{g.group}</p>
            <div className="emoji-grid">
              {g.items.map(([emoji, name]) => (
                <button
                  key={emoji}
                  type="button"
                  className="emoji-opt"
                  aria-label={name}
                  title={name}
                  tabIndex={flat[0][0] === emoji ? 0 : -1}
                  onClick={() => { onPick(emoji); setOpen(false); }}
                >
                  <span aria-hidden="true">{emoji}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
