import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import {
  EmptyState,
  Notice,
  Panel,
  StatCard,
  formatDateTime,
} from "@/components/admin/ui";
import { recentAudit } from "@/lib/audit";
import { activeSessionCount, requireSession } from "@/lib/auth";
import { adminConfigStatus, isEmailConfigured } from "@/lib/env";
import { isDatabaseConfigured } from "@/lib/db";
import { signOut, signOutEverywhere } from "../actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await requireSession();
  const config = adminConfigStatus();

  const [sessions, audit] = await Promise.all([
    activeSessionCount(session.adminId).catch(() => 0),
    recentAudit(15).catch(() => []),
  ]);

  return (
    <>
      <AdminHeader
        title="Settings"
        subtitle="Account, security and configuration"
      />

      <div className="admin-content">
        <Panel title="Signed in as" flush>
          <dl className="admin-dl">
            <div>
              <dt>Account</dt>
              <dd>{session.email}</dd>
            </div>
            <div>
              <dt>Session expires</dt>
              <dd>{formatDateTime(session.expiresAt)}</dd>
            </div>
            <div>
              <dt>Active sessions</dt>
              <dd>{sessions}</dd>
            </div>
            <div>
              <dt>Public site</dt>
              <dd>
                <Link href="/" target="_blank">
                  Open the Mivo site
                </Link>
              </dd>
            </div>
          </dl>
        </Panel>

        <Panel title="Security actions">
          <div style={{ display: "grid", gap: 14 }}>
            <Notice>
              Signing out revokes this session on the server, so the cookie
              cannot be reused even if it was copied. Sign out everywhere if a
              device has been lost.
            </Notice>

            <div className="admin-form-actions">
              <form action={signOut}>
                <button type="submit" className="admin-button">
                  Sign out
                </button>
              </form>

              <form action={signOutEverywhere}>
                <button type="submit" className="admin-button admin-button--danger">
                  Sign out everywhere
                </button>
              </form>
            </div>

            <Notice tone="warning">
              Your email and password cannot be changed from this screen by
              design — they are set through environment variables so a stolen
              session cannot lock you out of your own account. To rotate them,
              follow the steps in{" "}
              <code>docs/admin/README.md</code>.
            </Notice>
          </div>
        </Panel>

        <Panel
          title="Configuration"
          description="Variable names and whether they are set — values are never displayed"
          flush
        >
          <div className="admin-table-wrap">
            <table className="admin-table">
              <caption>Environment variables detected on the server</caption>
              <thead>
                <tr>
                  <th scope="col">Variable</th>
                  <th scope="col">Required</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {config.map((item) => (
                  <tr key={item.name}>
                    <td data-label="Variable">
                      <code>{item.name}</code>
                    </td>
                    <td data-label="Required">
                      {item.required ? "Required" : "Optional"}
                    </td>
                    <td data-label="Status">
                      <span
                        className={`admin-badge admin-badge--${
                          item.set
                            ? "positive"
                            : item.required
                              ? "negative"
                              : "neutral"
                        }`}
                      >
                        {item.set ? "Set" : "Not set"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 12,
          }}
        >
          <StatCard
            label="Database"
            value={isDatabaseConfigured() ? "Connected" : "Not configured"}
            hint={
              isDatabaseConfigured()
                ? "Enquiries, projects and analytics are being stored"
                : "Set DATABASE_URL to enable storage"
            }
          />
          <StatCard
            label="Email notifications"
            value={isEmailConfigured() ? "Enabled" : "Not configured"}
            hint={
              isEmailConfigured()
                ? "New enquiries are emailed to you"
                : "Set RESEND_API_KEY, EMAIL_FROM and EMAIL_TO"
            }
          />
          <StatCard
            label="Analytics collection"
            value={isDatabaseConfigured() ? "Active" : "Inactive"}
            hint="Anonymous events only — no cookies, no identifiers"
          />
        </div>

        <Panel
          title="Recent activity"
          description="Audit trail for this admin account"
          flush
        >
          {audit.length === 0 ? (
            <EmptyState
              title="No activity recorded yet"
              description="Sign-ins, status changes and deletions are logged here once the database is connected."
            />
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <caption>Most recent admin activity</caption>
                <thead>
                  <tr>
                    <th scope="col">When</th>
                    <th scope="col">Action</th>
                    <th scope="col">Target</th>
                    <th scope="col">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map((entry) => (
                    <tr key={entry.id}>
                      <td data-label="When">{formatDateTime(entry.created_at)}</td>
                      <td data-label="Action">
                        <code>{entry.action}</code>
                      </td>
                      <td data-label="Target">
                        {entry.target_type
                          ? `${entry.target_type} ${entry.target_id ?? ""}`.trim()
                          : "—"}
                      </td>
                      <td data-label="Detail">{entry.detail ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Data export">
          <div className="admin-form-actions">
            <a
              className="admin-button"
              href="/api/admin/export/enquiries"
              download
            >
              Export enquiries (CSV)
            </a>
            <a
              className="admin-button"
              href="/api/admin/export/analytics"
              download
            >
              Export analytics summary (CSV)
            </a>
          </div>
          <p className="admin-stat__hint" style={{ marginTop: 12 }}>
            Exports contain private client data. Store them securely and delete
            copies you no longer need.
          </p>
        </Panel>
      </div>
    </>
  );
}
