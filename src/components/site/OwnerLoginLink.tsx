import Link from "next/link";

const DEFAULT_PRODUCTION_URL = "https://mivo-syllis-projects.vercel.app";

/**
 * Discreet owner sign-in entry point on the public site.
 * Points at the live Vercel URL when configured, otherwise /login on the
 * current host (local dev).
 */
export function OwnerLoginLink() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const href = configured
    ? `${configured}/login`
    : `${DEFAULT_PRODUCTION_URL}/login`;

  const external =
    !configured || !configured.includes("localhost");

  if (external) {
    return (
      <a
        href={href}
        className="owner-login"
        aria-label="Owner sign in"
        title="Owner sign in"
      >
        <LockIcon />
      </a>
    );
  }

  return (
    <Link
      href="/login"
      className="owner-login"
      aria-label="Owner sign in"
      title="Owner sign in"
    >
      <LockIcon />
    </Link>
  );
}

function LockIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 11V8a5 5 0 0 1 10 0v3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <rect
        x="5"
        y="11"
        width="14"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  );
}
