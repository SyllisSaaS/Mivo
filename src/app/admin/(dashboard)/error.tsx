"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Admin error boundary.
 *
 * Shows a friendly message only. The real error — stack trace, SQL detail,
 * environment state — stays in the server logs and is never rendered.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] render error", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="admin-content">
      <div className="admin-panel">
        <div className="admin-empty">
          <h3>Something went wrong</h3>
          <p>
            This screen could not load. The details have been logged on the
            server. If it keeps happening, check that the database is reachable
            and that the required environment variables are set.
          </p>
          {error.digest && (
            <p style={{ marginTop: 8 }}>
              Reference: <code>{error.digest}</code>
            </p>
          )}
          <div className="admin-empty__actions">
            <button type="button" className="admin-button" onClick={reset}>
              Try again
            </button>
            <Link className="admin-button" href="/admin">
              Back to overview
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
