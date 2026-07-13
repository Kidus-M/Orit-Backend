"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "Our story" },
  { href: "/gallery", label: "Gallery" },
  { href: "/download", label: "Get the app" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="brand-lockup" href="/" aria-label="Orit Tej home">
          <span className="brand-mark" aria-hidden="true">
            OT
          </span>
          <span>
            <strong>Orit Tej</strong>
            <small>Ethiopian honey wine</small>
          </span>
        </Link>

        <button
          className="menu-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="site-navigation"
          aria-label={open ? "Close navigation" : "Open navigation"}
          onClick={() => setOpen((value) => !value)}
        >
          <span />
          <span />
        </button>

        <nav
          id="site-navigation"
          className={"site-nav " + (open ? "site-nav--open" : "")}
          aria-label="Primary navigation"
        >
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={active ? "is-active" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
