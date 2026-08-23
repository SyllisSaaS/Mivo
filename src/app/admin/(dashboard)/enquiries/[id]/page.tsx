import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import {
  Notice,
  Panel,
  StatusBadge,
  formatCurrency,
  formatDateTime,
} from "@/components/admin/ui";
import { recordAudit } from "@/lib/audit";
import { requireSession } from "@/lib/auth";
import { ENQUIRY_STATUSES, ENQUIRY_STATUS_LABELS } from "@/lib/constants";
import { getEnquiry, listNotes } from "@/lib/enquiries";
import {
  getDemoEnquiry,
  getDemoEnquiryNotes,
  isDemoEnquiryId,
  isDemoMode,
} from "@/lib/demo";
import { ipHashFromHeaders } from "@/lib/request";
import {
  addEnquiryNote,
  archiveEnquiry,
  removeEnquiry,
  removeEnquiryNote,
  setEnquiryStatus,
  setQuotedValue,
} from "../actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Enquiry" };

export default async function EnquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id: rawId } = await params;

  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const demo = await isDemoMode();
  const enquiry =
    demo && isDemoEnquiryId(id)
      ? getDemoEnquiry(id)
      : await getEnquiry(id);
  if (!enquiry) {
    notFound();
  }

  const notes =
    demo && isDemoEnquiryId(id)
      ? getDemoEnquiryNotes(id)
      : await listNotes(id);

  if (!demo || !isDemoEnquiryId(id)) {
    await recordAudit({
      adminId: session.adminId,
      action: "enquiry.viewed",
      targetType: "enquiry",
      targetId: id,
      ipHash: ipHashFromHeaders(await headers()),
    });
  }

  const readOnlyDemo = demo && isDemoEnquiryId(id);

  const details: [string, string | null][] = [
    ["Business", enquiry.business_name],
    ["Email", enquiry.email],
    ["Website", enquiry.website],
    ["Social", enquiry.social],
    ["Project type", enquiry.project_type],
    ["Pages", enquiry.page_count],
    ["Budget", enquiry.budget],
    ["Deadline", enquiry.deadline],
    ["Branding", enquiry.branding],
    ["Content", enquiry.content_state],
    ["Lead source", enquiry.lead_source],
  ];

  const quotedValue = enquiry.quoted_value ? Number(enquiry.quoted_value) : null;

  return (
    <>
      <AdminHeader
        title={enquiry.name}
        subtitle={`Received ${formatDateTime(enquiry.created_at)}`}
        actions={
          <>
            <Link className="admin-button admin-button--small" href="/admin/enquiries">
              Back to list
            </Link>
            <a
              className="admin-button admin-button--small admin-button--primary"
              href={`mailto:${enquiry.email}?subject=${encodeURIComponent(
                `Re: your ${enquiry.project_type.toLowerCase()} enquiry`
              )}`}
            >
              Reply by email
            </a>
          </>
        }
      />

      <div className="admin-content">
        {readOnlyDemo && (
          <Notice tone="warning">
            Demo enquiry — read-only sample data. Turn off demo mode to manage
            real enquiries.
          </Notice>
        )}
        <div className="admin-detail">
          {/* Left column — the enquiry itself */}
          <div style={{ display: "grid", gap: 20 }}>
            <Panel title="Enquiry details" flush>
              <dl className="admin-dl">
                <div>
                  <dt>Status</dt>
                  <dd>
                    <StatusBadge status={enquiry.status} />
                  </dd>
                </div>
                {details
                  .filter(([, value]) => Boolean(value))
                  .map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>
                        {label === "Email" ? (
                          <a href={`mailto:${value}`}>{value}</a>
                        ) : label === "Website" || label === "Social" ? (
                          <a
                            href={value as string}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                          >
                            {value}
                          </a>
                        ) : (
                          value
                        )}
                      </dd>
                    </div>
                  ))}
                <div>
                  <dt>Last updated</dt>
                  <dd>{formatDateTime(enquiry.updated_at)}</dd>
                </div>
                <div>
                  <dt>First response</dt>
                  <dd>
                    {enquiry.responded_at
                      ? formatDateTime(enquiry.responded_at)
                      : "Not yet responded"}
                  </dd>
                </div>
              </dl>
            </Panel>

            <Panel title="What they are looking for">
              <p className="admin-prose">{enquiry.description}</p>
            </Panel>

            {enquiry.features && (
              <Panel title="Requested features">
                <p className="admin-prose">{enquiry.features}</p>
              </Panel>
            )}

            <Panel
              title="Internal notes"
              description="Private to you — never shown on the public site"
            >
              {!readOnlyDemo && (
              <form
                action={addEnquiryNote}
                style={{ display: "grid", gap: 10, marginBottom: notes.length ? 20 : 0 }}
              >
                <input type="hidden" name="id" value={id} />
                <label className="admin-field">
                  <span>Add a note</span>
                  <textarea
                    name="body"
                    rows={3}
                    placeholder="Scope thoughts, classification (GREEN / YELLOW / RED), next steps…"
                    required
                  />
                </label>
                <div className="admin-form-actions">
                  <button
                    type="submit"
                    className="admin-button admin-button--primary admin-button--small"
                  >
                    Save note
                  </button>
                </div>
              </form>
              )}

              {notes.length > 0 && (
                <div className="admin-notes">
                  {notes.map((note) => (
                    <article className="admin-note" key={note.id}>
                      <time dateTime={note.created_at}>
                        {formatDateTime(note.created_at)}
                      </time>
                      <p>{note.body}</p>
                      {!readOnlyDemo && (
                      <form action={removeEnquiryNote} style={{ marginTop: 8 }}>
                        <input type="hidden" name="id" value={id} />
                        <input type="hidden" name="noteId" value={note.id} />
                        <ConfirmSubmit message="Delete this note?">
                          Delete note
                        </ConfirmSubmit>
                      </form>
                      )}
                    </article>
                  ))}
                </div>
              )}
              {readOnlyDemo && notes.length === 0 && (
                <p className="admin-stat__hint">No demo notes for this enquiry.</p>
              )}
            </Panel>
          </div>

          {/* Right column — actions */}
          <div style={{ display: "grid", gap: 20 }}>
            {!readOnlyDemo && (
            <>
            <Panel title="Update status">
              <form action={setEnquiryStatus} style={{ display: "grid", gap: 10 }}>
                <input type="hidden" name="id" value={id} />
                <label className="admin-field">
                  <span>Status</span>
                  <select name="status" defaultValue={enquiry.status}>
                    {ENQUIRY_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {ENQUIRY_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  className="admin-button admin-button--primary admin-button--small"
                >
                  Save status
                </button>
              </form>
            </Panel>

            <Panel
              title="Quoted value"
              description="Used for pipeline and average-quote figures"
            >
              <form action={setQuotedValue} style={{ display: "grid", gap: 10 }}>
                <input type="hidden" name="id" value={id} />
                <label className="admin-field">
                  <span>Amount (GBP)</span>
                  <input
                    type="text"
                    name="quotedValue"
                    inputMode="decimal"
                    defaultValue={quotedValue ?? ""}
                    placeholder="e.g. 850"
                  />
                </label>
                <button
                  type="submit"
                  className="admin-button admin-button--small"
                >
                  Save value
                </button>
                {quotedValue !== null && (
                  <p className="admin-stat__hint">
                    Currently {formatCurrency(quotedValue)}
                  </p>
                )}
              </form>
            </Panel>

            <Panel title="Manage">
              <div style={{ display: "grid", gap: 12 }}>
                <Notice>
                  Archiving keeps the record and hides it from the default list.
                  Deleting removes it permanently.
                </Notice>

                <form action={archiveEnquiry}>
                  <input type="hidden" name="id" value={id} />
                  <button type="submit" className="admin-button admin-button--small">
                    Archive enquiry
                  </button>
                </form>

                <form action={removeEnquiry}>
                  <input type="hidden" name="id" value={id} />
                  <ConfirmSubmit
                    message="Permanently delete this enquiry and its notes? This cannot be undone."
                  >
                    Delete permanently
                  </ConfirmSubmit>
                </form>
              </div>
            </Panel>
            </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
