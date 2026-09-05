/**
 * Portfolio projects.
 *
 * To add a project, append an entry here — no components need changing.
 *
 * `type` must be honest:
 *   client   — real, paid client work
 *   personal — your own project
 *   concept  — a demo or exploration, never presented as client work
 */

export type ProjectKind = "client" | "personal" | "concept";

export interface PortfolioProject {
  slug: string;
  name: string;
  type: ProjectKind;
  category: string;
  description: string;
  technologies?: string[];
  liveUrl?: string;
  caseStudyUrl?: string;
  previewClass: string;
  previewLabel: string;
  featured?: boolean;
  large?: boolean;
}

export const PROJECT_KIND_LABELS: Record<ProjectKind, string> = {
  client: "Client project",
  personal: "Personal project",
  concept: "Concept",
};

export const portfolioProjects: PortfolioProject[] = [
  {
    slug: "syllis",
    name: "Syllis",
    type: "personal",
    category: "Brand platform",
    description:
      "A personal project exploring brand discovery — product design, layout and front-end development.",
    technologies: ["Next.js", "TypeScript", "Postgres"],
    liveUrl: "https://syllismain.vercel.app/",
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
      "This site — portfolio, services and enquiry flow, with a private dashboard behind it.",
    technologies: ["Next.js", "TypeScript", "Postgres"],
    previewClass: "preview-mivo",
    previewLabel: "MIVO",
    featured: true,
    large: false,
  },
];

export function featuredProjects(): PortfolioProject[] {
  return portfolioProjects.filter((project) => project.featured !== false);
}
