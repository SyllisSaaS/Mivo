import type { AnalyticsEventName } from "./constants";

/**
 * Fire-and-forget analytics beacon. Safe to import into Client Components:
 * it contains no secrets and posts to a public, rate-limited endpoint.
 */
export function trackEvent(name: AnalyticsEventName, path?: string): void {
  if (typeof window === "undefined") return;

  const body = JSON.stringify({
    name,
    path: path ?? window.location.pathname,
  });

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/analytics",
        new Blob([body], { type: "application/json" })
      );
      return;
    }
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // Analytics must never interfere with the visitor's experience.
  }
}
