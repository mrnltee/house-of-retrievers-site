"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { LogOut, PawPrint } from "lucide-react";
import { NAV_ICONS } from "./navIcons.mjs";

// Same key as the pre-paint script in layout.jsx.
const NAV_KEY = "hor-admin-nav";

/**
 * The admin menu: a sidebar on computers. On phones, a top bar (logo, the page
 * you're on, Menu) that opens the whole menu as a panel.
 *
 * On computers the sidebar collapses to a rail of icons (owner, 23 Nov 2026). The toggle is a paw that
 * points the way the sidebar will go: left to collapse, right to expand. The choice is kept per browser.
 * In the rail every label stays in the page for screen readers, and hovering or focusing an item shows
 * its name beside it.
 */
export default function AdminNav({ groups: serverGroups, home, me }) {
  const pathname = usePathname();
  // The floating chat (ChatBubble.jsx) keeps the Team chat count current between page loads.
  const [chatUnread, setChatUnread] = useState(null);
  useEffect(() => {
    const onUnread = (e) => setChatUnread(Number(e.detail?.unread) || 0);
    window.addEventListener("hor-chat-unread", onUnread);
    return () => window.removeEventListener("hor-chat-unread", onUnread);
  }, []);
  const groups = chatUnread === null ? serverGroups : serverGroups.map(([label, items]) => [label, items.map((i) => (i.icon === "chat" ? { ...i, badge: chatUnread } : i))]);
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [tip, setTip] = useState(null);
  const navRef = useRef(null);
  const isCurrent = (href) => (href === home ? pathname === home || pathname === `${home}/` : pathname === href || pathname.startsWith(`${href}/`));
  const here = groups.flatMap(([, items]) => items).filter((i) => i.href && isCurrent(i.href)).sort((a, b) => b.href.length - a.href.length)[0];
  const unread = groups.flatMap(([, items]) => items).reduce((n, i) => n + (i.badge || 0), 0);

  // The pre-paint script already set the attribute; read it back rather than localStorage, so both agree.
  useEffect(() => setCollapsed(document.documentElement.dataset.adminNav === "collapsed"), []);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    setTip(null);
    if (next) document.documentElement.dataset.adminNav = "collapsed";
    else delete document.documentElement.dataset.adminNav;
    try {
      if (next) localStorage.setItem(NAV_KEY, "collapsed");
      else localStorage.removeItem(NAV_KEY);
    } catch {
      // Private mode: the choice lasts until the page reloads.
    }
  };

  // Names beside the icons while collapsed. Fixed-position, because the sidebar scrolls and would clip it.
  const showTip = useCallback(
    (e) => {
      if (!collapsed || !window.matchMedia("(min-width: 861px)").matches) return;
      const el = e.target.closest?.("[data-tip]");
      if (!el || !navRef.current?.contains(el)) return;
      const r = el.getBoundingClientRect();
      setTip({ text: el.dataset.tip, top: r.top + r.height / 2, left: r.right + 10 });
    },
    [collapsed],
  );
  const hideTip = useCallback(() => setTip(null), []);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!tip) return undefined;
    const onKey = (e) => e.key === "Escape" && setTip(null);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", hideTip, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", hideTip, true);
    };
  }, [tip, hideTip]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.documentElement.classList.add("admin-menu-open");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("admin-menu-open");
    };
  }, [open]);

  const toggleLabel = collapsed ? "Expand menu" : "Collapse menu";

  return (
    <nav
      ref={navRef}
      className={`admin-side${open ? " is-open" : ""}`}
      aria-label="Admin"
      onMouseOver={showTip}
      onFocus={showTip}
      onMouseLeave={hideTip}
      onBlur={hideTip}
    >
      <div className="admin-mbar">
        <a className="admin-mbar-logo" href={home}><img src="/house-of-retrievers-logo-reverse.png" alt="Admin home" width="1396" height="564" /></a>
        <span className="admin-mbar-here">{isCurrent(me.href) ? "Your profile" : here?.name || "Admin"}</span>
        <button type="button" className="admin-menu-btn" aria-expanded={open} aria-controls="admin-menu" onClick={() => setOpen((v) => !v)}>
          <span className="admin-menu-icon" aria-hidden="true"><i /><i /><i /></span>
          {open ? "Close" : "Menu"}
          {!open && unread > 0 && <span className="unread" aria-label={`${unread} unread`}>{unread > 99 ? "99+" : unread}</span>}
        </button>
      </div>
      <div className="admin-menu" id="admin-menu">
      <div className="admin-side-head">
        <a className="logo" href={home} data-tip="Admin home">
          {/* The rail shows only the two dogs: the same artwork, with the wordmark cropped off by its frame. */}
          <span className="logo-frame">
            <img src="/house-of-retrievers-logo-reverse.png" alt="The House of Retrievers’ Society, Inc. — admin home" width="1396" height="564" />
          </span>
        </a>
        <button
          type="button"
          className="admin-collapse"
          aria-expanded={!collapsed}
          aria-controls="admin-menu"
          aria-label={toggleLabel}
          data-tip={toggleLabel}
          onClick={toggle}
        >
          <PawPrint size={20} strokeWidth={1.9} className={`admin-collapse-paw${collapsed ? " is-right" : ""}`} aria-hidden="true" focusable="false" />
        </button>
      </div>
      <p className="tag">ADMIN</p>
      {groups.map(([label, items]) => (
        <div key={label} style={{ display: "contents" }}>
          <p className="group"><span className="admin-label">{label}</span></p>
          {items.map((item) => {
            const Glyph = NAV_ICONS[item.icon];
            const glyph = Glyph ? <Glyph size={20} strokeWidth={1.9} className="admin-ico" aria-hidden="true" focusable="false" /> : null;
            return item.href ? (
              <a
                key={item.name}
                className="admin-link"
                href={item.href}
                aria-current={isCurrent(item.href) ? "page" : undefined}
                data-tip={item.badge > 0 ? `${item.name} · ${item.badge} unread` : item.name}
              >
                {glyph}
                <span className="admin-label">{item.name}</span>
                {item.badge > 0 && <span className="unread" aria-label={`${item.badge} unread`}>{item.badge > 99 ? "99+" : item.badge}</span>}
              </a>
            ) : (
              <span key={item.name} className="soon" data-tip={`${item.name} · later phase`}>
                {glyph}
                <span className="admin-label">{item.name} <small>· later phase</small></span>
              </span>
            );
          })}
        </div>
      ))}
      <div className="me">
        <a className="me-card" href={me.href} title={collapsed ? undefined : `${me.email} · Your profile`} data-tip={`${me.name} · Your profile`} aria-current={isCurrent(me.href) ? "page" : undefined}>
          <span className="me-avatar" aria-hidden="true">{me.photo ? <img src={me.photo} alt="" /> : me.initials}</span>
          <span className="me-text admin-label"><strong>{me.name}</strong><span>{me.role}</span></span>
        </a>
        <button type="button" className="admin-signout" data-tip="Sign out" onClick={() => signOut({ callbackUrl: `${home === "/" ? "" : home}/sign-in` })}>
          <LogOut size={18} strokeWidth={1.9} className="admin-ico" aria-hidden="true" focusable="false" />
          <span className="admin-label">Sign out</span>
        </button>
      </div>
      </div>
      {tip && (
        <span className="admin-tip" aria-hidden="true" style={{ top: tip.top, left: tip.left }}>
          {tip.text}
        </span>
      )}
    </nav>
  );
}
