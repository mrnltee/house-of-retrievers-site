"use client";

import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

export default function AdminNav({ groups, home, me }) {
  const pathname = usePathname();
  const isCurrent = (href) => (href === home ? pathname === home || pathname === `${home}/` : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <nav className="admin-side" aria-label="Admin">
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
    </nav>
  );
}
