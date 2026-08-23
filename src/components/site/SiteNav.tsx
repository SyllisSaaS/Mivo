"use client";

import { useEffect, useState } from "react";

const LINKS = [
  { href: "#services", label: "Services" },
  { href: "#work", label: "Work" },
  { href: "#process", label: "Process" },
  { href: "#about", label: "About" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = document.querySelectorAll("main section[id]");
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(`#${entry.target.id}`);
          }
        }
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <header className={`navbar${scrolled ? " navbar--scrolled" : ""}`}>
      <a href="#home" className="logo" aria-label="Mivo — home">
        MIVO<span>.</span>
      </a>

      <nav
        id="siteNav"
        className={`nav-links${open ? " nav-links--open" : ""}`}
        aria-label="Primary"
      >
        {LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className={active === link.href ? "nav-link--active" : undefined}
            onClick={() => setOpen(false)}
          >
            {link.label}
          </a>
        ))}
        <a href="#quote" className="nav-cta" onClick={() => setOpen(false)}>
          Get a quote
        </a>
      </nav>

      <button
        type="button"
        className="menu-button"
        aria-expanded={open}
        aria-controls="siteNav"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>
    </header>
  );
}
