"use client";

import { useTransition } from "react";
import { toggleDemoMode } from "@/app/admin/(dashboard)/actions";

/**
 * Small admin-only control for sample dashboard data.
 * Never rendered on the public marketing site.
 */
export function DemoToggle({ enabled }: { enabled: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="admin-demo-toggle"
      action={() => startTransition(() => toggleDemoMode())}
    >
      <button
        type="submit"
        className={`admin-demo-toggle__button${
          enabled ? " admin-demo-toggle__button--on" : ""
        }`}
        disabled={pending}
        aria-pressed={enabled}
        aria-label={
          enabled
            ? "Demo data is on — click to show real figures"
            : "Show sample demo data in the dashboard"
        }
        title={
          enabled
            ? "Demo data on — click for real figures"
            : "Show demo data (sample only, not real)"
        }
      >
        {enabled ? "Demo" : "Demo"}
      </button>
    </form>
  );
}
