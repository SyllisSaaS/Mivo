/**
 * Portfolio projects — add new entries here.
 *
 * type: "client" | "personal" | "concept"
 * Never label a concept or personal project as a paid client.
 */

const PORTFOLIO_PROJECTS = [
  {
    slug: "syllis",
    name: "Syllis",
    type: "personal",
    category: "Brand platform",
    description:
      "A personal project exploring brand discovery — product design, layout and front-end development.",
    technologies: ["HTML", "CSS", "JavaScript"],
    liveUrl: "https://syllis.vercel.app/",
    previewClass: "preview-syllis",
    previewLabel: "SYLLIS",
    featured: true,
    large: true,
  },
  {
    slug: "mivo",
    name: "Mivo",
    type: "personal",
    category: "Studio website",
    description:
      "The Mivo site itself — portfolio, services and project enquiry flow.",
    technologies: ["HTML", "CSS", "JavaScript"],
    previewClass: "preview-mivo",
    previewLabel: "MIVO",
    featured: true,
    large: false,
  },
];

const PROJECT_TYPE_LABELS = {
  client: "Client project",
  personal: "Personal project",
  concept: "Concept",
};

function renderPortfolio() {
  const grid = document.getElementById("portfolioGrid");
  if (!grid) return;

  const projects = PORTFOLIO_PROJECTS.filter((p) => p.featured !== false);

  grid.innerHTML = projects
    .map((project) => {
      const Tag = project.liveUrl ? "a" : "article";
      const attrs = project.liveUrl
        ? `href="${project.liveUrl}" target="_blank" rel="noopener noreferrer"`
        : "";
      const largeClass = project.large ? " project-card--large" : "";
      const arrow = project.liveUrl ? "↗" : "";

      const techList = project.technologies
        ? `<p class="project-card__tech">${project.technologies.join(" · ")}</p>`
        : "";

      return `
        <${Tag} class="project-card${largeClass}" ${attrs}>
          <div class="project-card__preview ${project.previewClass}">
            <span>${project.previewLabel}</span>
          </div>
          <div class="project-card__body">
            <div class="project-card__meta">
              <span class="badge badge--${project.type}">${PROJECT_TYPE_LABELS[project.type]}</span>
              <span class="project-card__category">${project.category}</span>
            </div>
            <div class="project-card__info">
              <div>
                <h3>${project.name}</h3>
                <p>${project.description}</p>
                ${techList}
              </div>
              ${arrow ? `<span class="project-card__arrow" aria-hidden="true">${arrow}</span>` : ""}
            </div>
          </div>
        </${Tag}>
      `;
    })
    .join("");

  grid.innerHTML += `
    <article class="project-card project-card--cta">
      <div class="project-card__cta-inner">
        <span class="project-card__cta-icon" aria-hidden="true">+</span>
        <h3>Your project here</h3>
        <p>Have something in mind? Tell me about it — I'd like to hear what you're building.</p>
        <a href="#quote" class="button button-primary">Get a quote</a>
      </div>
    </article>
  `;
}

document.addEventListener("DOMContentLoaded", renderPortfolio);
