import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { requireSession } from "@/lib/auth";
import { isDatabaseConfigured, query } from "@/lib/db";
import { signOut } from "./actions";

/**
 * Authenticated shell for every admin page.
 *
 * `requireSession()` validates the session cookie against the database on
 * every request. The Edge proxy has already turned away visitors with no
 * cookie; this is the check that actually authorises access.
 */

export const dynamic = "force-dynamic";

async function newEnquiryCount(): Promise<number> {
  if (!isDatabaseConfigured()) return 0;
  try {
    const rows = await query<{ count: string }>(
      `SELECT count(*)::text AS count FROM enquiries WHERE status = 'NEW'`
    );
    return Number(rows[0]?.count ?? "0");
  } catch {
    return 0;
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const newEnquiries = await newEnquiryCount();

  return (
    <div className="admin-shell">
      <AdminSidebar
        email={session.email}
        newEnquiries={newEnquiries}
        signOut={
          <form action={signOut}>
            <button type="submit" className="admin-button admin-button--small">
              Sign out
            </button>
          </form>
        }
      />
      <div className="admin-main">{children}</div>
    </div>
  );
}
