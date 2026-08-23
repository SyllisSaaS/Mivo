"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

/**
 * Admin navigation.
 *
 * Client-side only because it tracks the active route and toggles on mobile.
 * It renders no private data beyond the counts passed in from the server.
 */

const ITEMS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/enquiries", label: "Enquiries" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/settings", label: "Settings" },
] as const;

export function AdminSidebar({
  email,
  newEnquiries,
  signOut,
}: {
  email: string;
  newEnquiries: number;
  signOut: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <aside className="admin-sidebar" data-open={open}>
      <div className="admin-sidebar__brand">
        MIVO
        <small>Admin</small>
        <button
          type="button"
          className="admin-menu-toggle"
          style={{ marginLeft: "auto" }}
          aria-expanded={open}
          aria-controls="adminNav"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      <nav className="admin-nav" id="adminNav" aria-label="Admin sections">
        {ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href) ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            {item.label}
            {item.href === "/admin/enquiries" && newEnquiries > 0 && (
              <span className="admin-nav__count">{newEnquiries}</span>
            )}
          </Link>
        ))}
      </nav>

      <div className="admin-sidebar__footer">
        <span className="admin-sidebar__account">{email}</span>
        {signOut}
      </div>
    </aside>
  );
}
