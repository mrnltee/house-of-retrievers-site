"use client";

import { CHAT_POLL, shouldPoll } from "../../lib/admin/chatBubble.mjs";

/**
 * When the admin last touched the page (owner, 24 Nov 2026), so the team chat stops asking the server while
 * nobody is there. One listener set per tab, shared by the floating button and the chat room. A touch after
 * the admin was away (or coming back to the tab) wakes every subscriber so it checks at once.
 */
const EVENTS = ["pointerdown", "keydown", "wheel", "touchstart", "scroll"];
const wakers = new Set();
let lastActive = Date.now();
let installed = false;

function mark() {
  const wasAway = Date.now() - lastActive >= CHAT_POLL.idleAfterMs;
  lastActive = Date.now();
  if (wasAway) wakers.forEach((wake) => wake());
}

function install() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  for (const type of EVENTS) window.addEventListener(type, mark, { passive: true, capture: true });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") mark(); });
}

/** True when the chat should ask the server now (tab visible, admin not away). */
export function chatShouldPoll() {
  install();
  return shouldPoll({ visible: document.visibilityState === "visible", lastActiveAt: lastActive, now: Date.now() });
}

/** Calls `wake` when the admin comes back after being away. Returns the unsubscribe function. */
export function onChatWake(wake) {
  install();
  wakers.add(wake);
  return () => wakers.delete(wake);
}
