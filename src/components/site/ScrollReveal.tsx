"use client";

import { useEffect } from "react";

/**
 * Reveals elements carrying the `.reveal` class as they scroll into view.
 *
 * Mounted once for the whole page so the sections themselves stay as Server
 * Components. Does nothing when the visitor prefers reduced motion — the CSS
 * already shows those elements at full opacity.
 */
export function ScrollReveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const elements = document.querySelectorAll(".reveal");
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal--visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return null;
}
