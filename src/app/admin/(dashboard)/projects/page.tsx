import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import {
  DatabaseNotice,
  EmptyState,
  Notice,
  Panel,
  StatusBadge,
  formatCurrency,
  formatDate,
} from "@/components/admin/ui";
import { requireSession } from "@/lib/auth";
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from "@/lib/constants";
import { isDatabaseConfigured } from "@/lib/db";
import { demoProjectsList, isDemoMode } from "@/lib/demo";
import { getProject, listProjects } from "@/lib/projects";
import { addProject, editProject, removeProject } from "./actions";
import { ProjectForm } from "./ProjectForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Projects" };

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; edit?: string; new?: string }>;
}) {
  await requireSession();
  const params = await searchParams;
  const demo = await isDemoMode();

  if (!demo && !isDatabaseConfigured()) {
    return (
      <>
        <AdminHeader title="Projects" subtitle="Private project tracking" />
        <div className="admin-content">
          <div className="admin-panel">
            <DatabaseNotice />
          </div>
        </div>
      </>
    );
  }

  const projects = demo ? demoProjectsList() : await listProjects(params.status);

  const editId = !demo && params.edit ? Number(params.edit) : null;
  const editing =
    editId && Number.isInteger(editId) ? await getProject(editId) : null;

  const showNewForm = !demo && (params.new === "1" || Boolean(editing));

  return (
    <>
      <AdminHeader
        title="Projects"
        subtitle={`${projects.length} ${
          projects.length === 1 ? "project" : "projects"
        }${params.status ? " in this view" : ""}`}
        actions={
          demo ? undefined : showNewForm ? (
            <Link className="admin-button admin-button--small" href="/admin/projects">
              Close form
            </Link>
          ) : (
            <Link
              className="admin-button admin-button--small admin-button--primary"
              href="/admin/projects?new=1"
            >
              New project
            </Link>
          )
        }
      />

      <div className="admin-content">
        {showNewForm && (
          <Panel
            title={editing ? `Edit — ${editing.name}` : "New project"}
            description={
              editing
                ? "Changes are saved immediately"
                : "Track a lead, quote or live build"
            }
          >
            <ProjectForm
              action={editing ? editProject : addProject}
              project={editing ?? undefined}
              submitLabel={editing ? "Save changes" : "Create project"}
            />
          </Panel>
        )}

        <Panel title="Filter by status">
          <div className="admin-form-actions">
            <Link
              className="admin-button admin-button--small"
              href="/admin/projects"
              aria-current={!params.status ? "true" : undefined}
            >
              All
            </Link>
            <Link
              className="admin-button admin-button--small"
              href="/admin/projects?status=ACTIVE"
              aria-current={params.status === "ACTIVE" ? "true" : undefined}
            >
              Active
            </Link>
            {PROJECT_STATUSES.map((status) => (
              <Link
                key={status}
                className="admin-button admin-button--small"
                href={`/admin/projects?status=${status}`}
                aria-current={params.status === status ? "true" : undefined}
              >
                {PROJECT_STATUS_LABELS[status]}
              </Link>
            ))}
          </div>
        </Panel>

        <Panel title="Project list" flush>
          {projects.length === 0 ? (
            <EmptyState
              title={params.status ? "No projects in this view" : "No projects yet"}
              description="Create a project when an enquiry turns into real work. Values you record here feed the pipeline figures on the overview."
            >
              <Link
                className="admin-button admin-button--primary"
                href="/admin/projects?new=1"
              >
                Create the first project
              </Link>
            </EmptyState>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <caption>All tracked projects</caption>
                <thead>
                  <tr>
                    <th scope="col">Project</th>
                    <th scope="col">Status</th>
                    <th scope="col">Value</th>
                    <th scope="col">Payment</th>
                    <th scope="col">Deadline</th>
                    <th scope="col">Links</th>
                    <th scope="col">
                      <span className="visually-hidden">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr key={project.id}>
                      <td data-label="Project">
                        <span className="admin-table__main">{project.name}</span>
                        <span className="admin-table__sub">
                          {project.client_name ?? "No client recorded"}
                          {project.folder_ref ? ` · ${project.folder_ref}` : ""}
                        </span>
                      </td>
                      <td data-label="Status">
                        <StatusBadge status={project.status} kind="project" />
                      </td>
                      <td data-label="Value" className="admin-table__num">
                        {formatCurrency(
                          project.value ? Number(project.value) : null
                        ) ?? "—"}
                      </td>
                      <td data-label="Payment">
                        {project.final_paid
                          ? "Paid in full"
                          : project.deposit_paid
                            ? "Deposit received"
                            : "Nothing received"}
                      </td>
                      <td data-label="Deadline">{formatDate(project.deadline)}</td>
                      <td data-label="Links">
                        {project.live_url && (
                          <a
                            href={project.live_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Live
                          </a>
                        )}
                        {project.live_url && project.repo_url ? " · " : ""}
                        {project.repo_url && (
                          <a
                            href={project.repo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Repo
                          </a>
                        )}
                        {!project.live_url && !project.repo_url && "—"}
                      </td>
                      <td data-label="Actions">
                        <span
                          style={{ display: "inline-flex", gap: 8, flexWrap: "wrap" }}
                        >
                          <Link
                            className="admin-button admin-button--small"
                            href={`/admin/projects?edit=${project.id}`}
                          >
                            Edit
                          </Link>
                          <form action={removeProject}>
                            <input type="hidden" name="id" value={project.id} />
                            <ConfirmSubmit
                              message={`Permanently delete "${project.name}"? This cannot be undone.`}
                            >
                              Delete
                            </ConfirmSubmit>
                          </form>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Notice tone="warning">
          Never store passwords, API keys, access tokens or client credentials in
          project notes. Keep them in a password manager and reference them by
          name only.
        </Notice>
      </div>
    </>
  );
}
