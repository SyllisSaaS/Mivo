import {
  PROJECT_KIND_LABELS,
  type PortfolioProject,
} from "@/data/portfolio";

/**
 * Portfolio card. The type badge is always rendered so a concept or personal
 * project can never be mistaken for paid client work.
 */
export function ProjectCard({ project }: { project: PortfolioProject }) {
  const body = (
    <>
      <div className={`project-card__preview ${project.previewClass}`}>
        <span>{project.previewLabel}</span>
      </div>

      <div className="project-card__body">
        <div className="project-card__meta">
          <span className={`badge badge--${project.type}`}>
            {PROJECT_KIND_LABELS[project.type]}
          </span>
          <span className="project-card__category">{project.category}</span>
        </div>

        <div className="project-card__info">
          <div>
            <h3>{project.name}</h3>
            <p>{project.description}</p>
            {project.technologies && (
              <p className="project-card__tech">
                {project.technologies.join(" · ")}
              </p>
            )}
          </div>
          {project.liveUrl && (
            <span className="project-card__arrow" aria-hidden="true">
              ↗
            </span>
          )}
        </div>
      </div>
    </>
  );

  const className = `project-card${project.large ? " project-card--large" : ""}`;

  if (project.liveUrl) {
    return (
      <a
        className={className}
        href={project.liveUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${project.name} — ${PROJECT_KIND_LABELS[project.type]}, opens in a new tab`}
      >
        {body}
      </a>
    );
  }

  return <article className={className}>{body}</article>;
}
