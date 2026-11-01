"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

/**
 * The admin menu: a sidebar on computers. On phones, a top bar (logo, the page
 * you're on, Menu) that opens the whole menu as a panel.
 */
export default function AdminNav({ groups, home, me }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isCurrent = (href) => (href === home ? pathname === home || pathname === `${home}/` : pathname === href || pathname.startsWith(`${href}/`));
  const here = groups.flatMap(([, items]) => items).filter((i) => i.href && isCurrent(i.href)).sort((a, b) => b.href.length - a.href.length)[0];
  const unread = groups.flatMap(([, items]) => items).reduce((n, i) => n + (i.badge || 0), 0);

  useEffect(() => setOpen(false), [pathname]);
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

  return (
    <nav className={`admin-side${open ? " is-open" : ""}`} aria-label="Admin">
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
      <a className="logo" href={home}>
        <img src="/house-of-retrievers-logo-reverse.png" alt="The House of Retrievers Society Inc. — admin home" width="1396" height="564" />
      </a>
      <p className="tag">ADMIN</p>
      {groups.map(([label, items]) => (
        <div key={label} style={{ display: "contents" }}>
          <p className="group">{label}</p>
          {items.map((item) =>
            item.href ? (
              <a key={item.name} className="admin-link" href={item.href} aria-current={isCurrent(item.href) ? "page" : undefined}>
                {item.name}
                {item.badge > 0 && <span className="unread" aria-label={`${item.badge} unread`}>{item.badge > 99 ? "99+" : item.badge}</span>}
              </a>
            ) : (
              <span key={item.name} className="soon">
                {item.name} <small>· later phase</small>
              </span>
            ),
          )}
        </div>
      ))}
      <div className="me">
        <a className="me-card" href={me.href} title={`${me.email} · Your profile`} aria-current={isCurrent(me.href) ? "page" : undefined}>
          <span className="me-avatar" aria-hidden="true">{me.photo ? <img src={me.photo} alt="" /> : me.initials}</span>
          <span className="me-text"><strong>{me.name}</strong><span>{me.role}</span></span>
        </a>
        <button type="button" onClick={() => signOut({ callbackUrl: `${home === "/" ? "" : home}/sign-in` })}>Sign out</button>
      </div>
      </div>
    </nav>
  );
}
