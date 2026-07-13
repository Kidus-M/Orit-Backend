"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);
  const lastPointerY = useRef<number | null>(null);

  useEffect(() => {
    let animationFrame = 0;
    lastScrollY.current = window.scrollY;

    function handleScroll() {
      cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const previousY = lastScrollY.current;

        if (currentY < 96 || currentY < previousY) {
          setVisible(true);
        } else if (currentY > previousY + 4 && currentY > 140 && !open) {
          setVisible(false);
        }

        lastScrollY.current = currentY;
      });
    }

    function handlePointerMove(event: PointerEvent) {
      const previousY = lastPointerY.current;

      if (
        event.clientY < 80 ||
        (previousY !== null && event.clientY < previousY - 8)
      ) {
        setVisible(true);
      }

      lastPointerY.current = event.clientY;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, [open]);

  const headerVisible = visible || open;

  return (
    <header
      className={
        "site-header " + (headerVisible ? "" : "site-header--hidden")
      }
    >
      <div className="site-header__inner">
        <Link className="brand-lockup" href="/" aria-label="Orit Tej home">
          <Image
            className="company-logo"
            src="/app-icon.png"
            alt=""
            width={52}
            height={52}
            priority
          />
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
          onClick={() => {
            setOpen((value) => !value);
            setVisible(true);
          }}
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
                onClick={() => setOpen(false)}
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
