"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, BellOff, Maximize2, MessageCircle, X } from "lucide-react";
import TeamChat from "./chat/TeamChat";
import { chatUnread } from "../chatActions";
import { CHAT_POLL, chatBubbleHidden, chatButtonLabel, liftAbove, shouldChime } from "../../lib/admin/chatBubble.mjs";
import { chatShouldPoll, onChatWake } from "./chatActivity";
import { SOUND_EVENT, chime, isMuted, setMuted, unlockOnFirstPress } from "./chatSound";

// Kept per browser: the newest message from someone else that already chimed (shared by every open tab).
const HEARD_KEY = "hor-chat-heard";
// Kept per tab: the panel was left open, so it opens again on the next page (computers only).
const OPEN_KEY = "hor-chat-open";
export const UNREAD_EVENT = "hor-chat-unread";
// Bars that stick to the bottom of the screen; the button rises above them. A new one can add data-bottom-bar.
const BOTTOM_BARS = ".form-actions-sticky, .access-savebar.has-changes, .access-savebar:not(.tracker-savebar), .sd-save, [data-bottom-bar]";

const read = (store, key) => { try { return store.getItem(key); } catch { return null; } };
const write = (store, key, value) => { try { if (value == null) store.removeItem(key); else store.setItem(key, value); } catch { /* private mode */ } };

/**
 * The floating team chat (owner, 23 Nov 2026): a round button in the bottom-right corner of every admin page
 * with the unread count, opening the team room in a panel over the page, so a message can be read and
 * answered without leaving what you're doing. It isn't a modal: the page stays usable beside it. Esc or ✕
 * closes it and puts focus back on the button. On phones the panel fills the screen. A new message from
 * someone else plays a soft chime (Bell / BellOff in the panel mutes it). Not on the chat page itself, nor on
 * the check-in display screen guests look at.
 */
export default function ChatBubble({ base, initialUnread = 0, preview = false }) {
  const pathname = usePathname();
  const hidden = chatBubbleHidden(pathname);
  const [open, setOpen] = useState(false);
  const [focusBox, setFocusBox] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [muted, setMutedState] = useState(false);
  const [lift, setLift] = useState(0);
  const [announce, setAnnounce] = useState("");
  const fab = useRef(null);
  const panelId = useId();
  const titleId = useId();

  // Sound: unlocked by the first press on the page; the mute choice follows other tabs.
  useEffect(() => {
    setMutedState(isMuted());
    const onSound = (e) => setMutedState(Boolean(e.detail?.muted));
    window.addEventListener(SOUND_EVENT, onSound);
    const stop = unlockOnFirstPress();
    return () => { window.removeEventListener(SOUND_EVENT, onSound); stop(); };
  }, []);

  // Chimes once per new message from someone else, in one tab only.
  const heardUpTo = useCallback((lastOther) => {
    const last = Number(lastOther) || 0;
    const heard = Number(read(localStorage, HEARD_KEY)) || 0;
    if (shouldChime({ lastOther: last, heard, muted: preview || isMuted() })) chime();
    if (last > heard) write(localStorage, HEARD_KEY, String(last));
  }, [preview]);

  const showUnread = useCallback((n) => {
    setUnread((before) => {
      if (n > before) setAnnounce(n - before === 1 ? "New message in team chat." : `${n - before} new messages in team chat.`);
      return n;
    });
    window.dispatchEvent(new CustomEvent(UNREAD_EVENT, { detail: { unread: n } }));
  }, []);

  // While the panel is shut, ask every 30 s, only while the tab is visible and the admin isn't away (CHAT_POLL).
  useEffect(() => {
    if (open) return undefined;
    let alive = true;
    const check = async () => {
      if (!chatShouldPoll()) return;
      const r = await chatUnread().catch(() => null);
      if (!alive || !r || r.error) return;
      heardUpTo(r.lastOther);
      if (!hidden) showUnread(r.unread);
    };
    check();
    const timer = setInterval(check, CHAT_POLL.bubbleMs);
    const stopWake = onChatWake(check);
    document.addEventListener("visibilitychange", check);
    return () => { alive = false; clearInterval(timer); stopWake(); document.removeEventListener("visibilitychange", check); };
  }, [open, hidden, heardUpTo, showUnread]);

  // While it's open the room refreshes itself; reading it clears the count.
  const onMessages = useCallback((messages) => {
    const others = messages.filter((m) => !m.mine && !m.deleted);
    heardUpTo(others.length ? Math.max(...others.map((m) => Number(m.id) || 0)) : 0);
    showUnread(0);
  }, [heardUpTo, showUnread]);

  // Left open on the last page? Open again here (computers only; on a phone it would cover the new page).
  useEffect(() => {
    if (hidden) { setOpen(false); return; }
    if (read(sessionStorage, OPEN_KEY) === "1" && window.matchMedia("(min-width: 561px)").matches) setOpen(true);
  }, [hidden]);

  // Rise above a save bar stuck to the bottom of the screen (event editor, trackers, page access…).
  useEffect(() => {
    if (hidden) return undefined;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const button = fab.current?.getBoundingClientRect();
      const bars = [...document.querySelectorAll(BOTTOM_BARS)].filter((el) => el.offsetParent !== null).map((el) => el.getBoundingClientRect());
      setLift(liftAbove(bars, { viewportHeight: window.innerHeight, buttonLeft: button ? button.left - 8 : window.innerWidth - 96 }));
    };
    const soon = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure();
    window.addEventListener("scroll", soon, { passive: true, capture: true });
    window.addEventListener("resize", soon);
    const watch = new MutationObserver(soon);
    watch.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "hidden", "open"] });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", soon, { capture: true });
      window.removeEventListener("resize", soon);
      watch.disconnect();
    };
  }, [hidden, pathname]);

  const show = (next, { focus = true } = {}) => {
    setOpen(next);
    setFocusBox(next && focus);
    write(sessionStorage, OPEN_KEY, next ? "1" : null);
    if (!next) requestAnimationFrame(() => fab.current?.focus());
  };

  const toggleSound = () => { const next = !muted; setMuted(next); setMutedState(next); };

  if (hidden) return null;

  return (
    <div className={`chat-float${open ? " is-open" : ""}`} style={{ "--chat-lift": `${lift}px` }}>
      <section
        id={panelId}
        className="chat-panel"
        role="dialog"
        aria-labelledby={titleId}
        hidden={!open}
        onKeyDown={(e) => { if (e.key === "Escape" && !e.defaultPrevented) { e.preventDefault(); show(false); } }}
      >
        <header className="chat-panel-head">
          <div>
            <h2 id={titleId}>Team chat</h2>
            <p>Everyone in the admin reads this room.</p>
          </div>
          <div className="chat-panel-tools">
            <button
              type="button"
              className="chat-tool"
              aria-pressed={!muted}
              aria-label="Sound for new messages"
              title={muted ? "Sound off: click to hear new messages" : "Sound on: click to mute"}
              onClick={toggleSound}
            >
              {muted ? <BellOff size={18} aria-hidden="true" /> : <Bell size={18} aria-hidden="true" />}
            </button>
            <a className="chat-tool" href={`${base}/chat`} aria-label="Open the full chat page" title="Open the full chat page">
              <Maximize2 size={18} aria-hidden="true" />
            </a>
            <button type="button" className="chat-tool" aria-label="Close team chat" title="Close (Esc)" onClick={() => show(false)}>
              <X size={20} aria-hidden="true" />
            </button>
          </div>
        </header>
        {open && <TeamChat compact preview={preview} autoFocus={focusBox} onMessages={onMessages} />}
        <p className="chat-panel-note">Keep phone numbers and payment details out of chat.</p>
      </section>
      <button
        ref={fab}
        type="button"
        className="chat-fab"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={chatButtonLabel(unread, open)}
        title={chatButtonLabel(unread, open)}
        onClick={() => show(!open)}
      >
        {open ? <X size={24} aria-hidden="true" /> : <MessageCircle size={26} aria-hidden="true" />}
        {!open && unread > 0 && <span className="chat-fab-badge" aria-hidden="true">{unread > 99 ? "99+" : unread}</span>}
      </button>
      <span className="visually-hidden" role="status">{announce}</span>
    </div>
  );
}
