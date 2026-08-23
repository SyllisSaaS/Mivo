import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from "@/lib/constants";
import type { ProjectRow } from "@/lib/projects";

/**
 * Create/edit form for a project. Rendered as a Server Component; submission
 * goes to a Server Action which re-validates and authorises everything.
 */
export function ProjectForm({
  action,
  project,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  project?: ProjectRow;
  submitLabel: string;
}) {
  return (
    <form action={action} style={{ display: "grid", gap: 14 }}>
      {project && <input type="hidden" name="id" value={project.id} />}

      <div className="admin-filters">
        <label className="admin-field">
          <span>Project name</span>
          <input
            type="text"
            name="name"
            required
            defaultValue={project?.name ?? ""}
          />
        </label>

        <label className="admin-field">
          <span>Client</span>
          <input
            type="text"
            name="clientName"
            defaultValue={project?.client_name ?? ""}
          />
        </label>

        <label className="admin-field">
          <span>Status</span>
          <select name="status" defaultValue={project?.status ?? "LEAD"}>
            {PROJECT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {PROJECT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>

        <label className="admin-field">
          <span>Linked enquiry ID</span>
          <input
            type="number"
            name="enquiryId"
            min={1}
            defaultValue={project?.enquiry_id ?? ""}
          />
        </label>

        <label className="admin-field">
          <span>Start date</span>
          <input
            type="date"
            name="startDate"
            defaultValue={project?.start_date ?? ""}
          />
        </label>

        <label className="admin-field">
          <span>Deadline</span>
          <input
            type="date"
            name="deadline"
            defaultValue={project?.deadline ?? ""}
          />
        </label>

        <label className="admin-field">
          <span>Project value (GBP)</span>
          <input
            type="text"
            name="value"
            inputMode="decimal"
            defaultValue={project?.value ?? ""}
          />
        </label>

        <label className="admin-field">
          <span>Domain</span>
          <input type="text" name="domain" defaultValue={project?.domain ?? ""} />
        </label>

        <label className="admin-field">
          <span>Hosting</span>
          <input
            type="text"
            name="hosting"
            placeholder="e.g. Vercel"
            defaultValue={project?.hosting ?? ""}
          />
        </label>

        <label className="admin-field">
          <span>Repository URL</span>
          <input type="url" name="repoUrl" defaultValue={project?.repo_url ?? ""} />
        </label>

        <label className="admin-field">
          <span>Live site URL</span>
          <input type="url" name="liveUrl" defaultValue={project?.live_url ?? ""} />
        </label>

        <label className="admin-field">
          <span>Project folder reference</span>
          <input
            type="text"
            name="folderRef"
            placeholder="projects/client-name"
            defaultValue={project?.folder_ref ?? ""}
          />
        </label>
      </div>

      <div className="admin-form-actions">
        <label className="admin-field admin-field--checkbox">
          <input
            type="checkbox"
            name="depositPaid"
            defaultChecked={project?.deposit_paid ?? false}
          />
          <span>Deposit paid</span>
        </label>

        <label className="admin-field admin-field--checkbox">
          <input
            type="checkbox"
            name="finalPaid"
            defaultChecked={project?.final_paid ?? false}
          />
          <span>Final payment received</span>
        </label>

        <label className="admin-field admin-field--checkbox">
          <input
            type="checkbox"
            name="maintenance"
            defaultChecked={project?.maintenance ?? false}
          />
          <span>On maintenance</span>
        </label>
      </div>

      <label className="admin-field">
        <span>Internal notes</span>
        <textarea
          name="notes"
          rows={4}
          placeholder="Scope decisions, client preferences, outstanding items. Never store passwords, API keys or access tokens here."
          defaultValue={project?.notes ?? ""}
        />
      </label>

      <div className="admin-form-actions">
        <button type="submit" className="admin-button admin-button--primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
