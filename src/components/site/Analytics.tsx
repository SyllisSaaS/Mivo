"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/track";

/**
 * Anonymous, aggregate-only analytics.
 *
 * No cookies are set and no identifiers are stored, so there is nothing to
 * link a series of events back to a person. Only the event name, path and
 * referrer hostname are recorded. See docs/admin/security.md.
 */
export function Analytics() {
  useEffect(() => {
    trackEvent("page_view", window.location.pathname);

    const sectionsSeen = new Set<string>();
    const workSection = document.getElementById("work");

    let observer: IntersectionObserver | undefined;
    if (workSection) {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting && !sectionsSeen.has("work")) {
              sectionsSeen.add("work");
              trackEvent("portfolio_view");
            }
          }
        },
        { threshold: 0.4 }
      );
      observer.observe(workSection);
    }

    const onClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement | null)?.closest("a");
      if (!target) return;

      const href = target.getAttribute("href") ?? "";

      if (href === "#quote") {
        trackEvent("contact_click");
        return;
      }

      if (/^https?:\/\//i.test(href)) {
        const isProjectCard = target.classList.contains("project-card");
        trackEvent(
          isProjectCard ? "portfolio_project_opened" : "outbound_link_click",
          new URL(href).hostname
        );
      }
    };

    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      observer?.disconnect();
    };
  }, []);

  return null;
}
