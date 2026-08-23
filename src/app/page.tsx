import { Analytics } from "@/components/site/Analytics";
import { OwnerLoginLink } from "@/components/site/OwnerLoginLink";
import { ProjectCard } from "@/components/site/ProjectCard";
import { QuoteForm } from "@/components/site/QuoteForm";
import { ScrollReveal } from "@/components/site/ScrollReveal";
import { SiteNav } from "@/components/site/SiteNav";
import { featuredProjects } from "@/data/portfolio";

const SERVICES = [
  {
    title: "Landing pages",
    body: "Focused single-page sites to promote a product, service or campaign.",
  },
  {
    title: "Business websites",
    body: "Multi-page sites for small businesses that need a clear, professional presence online.",
  },
  {
    title: "Portfolio websites",
    body: "Showcase sites for creators, freelancers and professionals who need to display their work.",
  },
  {
    title: "Website redesigns",
    body: "Refresh an outdated site — improved layout, typography, responsiveness and structure.",
  },
  {
    title: "E-commerce",
    body: "Simple online shops using established platforms — scoped carefully based on your needs.",
  },
  {
    title: "Custom functionality",
    body: "Contact forms, galleries, booking embeds and straightforward integrations — assessed before I commit.",
  },
];

const PROCESS = [
  { title: "Enquiry", body: "You tell me about your business and what you're looking for." },
  {
    title: "Requirements",
    body: "We clarify scope, pages, features and any existing assets you have.",
  },
  {
    title: "Proposal & quote",
    body: "I review everything and send a clear quote — no surprises.",
  },
  {
    title: "Design & development",
    body: "I build your site with regular check-ins so you can see progress.",
  },
  {
    title: "Review & revisions",
    body: "You review the site and we refine the details together.",
  },
  { title: "Launch", body: "Your site goes live, tested across devices and browsers." },
];

const SKILLS = [
  "HTML",
  "CSS",
  "JavaScript",
  "TypeScript",
  "Next.js",
  "Responsive design",
  "GitHub",
  "Vercel",
];

export default function HomePage() {
  const projects = featuredProjects();

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <SiteNav />

      <main id="main">
        <section className="hero" id="home">
          <div className="hero__inner reveal">
            <p className="eyebrow">Web design &amp; development</p>

            <h1>
              Websites built around <span>your business.</span>
            </h1>

            <p className="hero__description">
              Mivo designs and develops modern, responsive websites for
              businesses, brands and creators — tailored to how you actually
              work, not pulled from a generic template.
            </p>

            <div className="hero__actions">
              <a href="#quote" className="button button-primary">
                Get a quote
              </a>
              <a href="#work" className="button button-secondary">
                View my work
              </a>
            </div>
          </div>

          <p className="scroll-indicator" aria-hidden="true">
            Scroll to explore
          </p>
        </section>

        <div className="ticker" aria-hidden="true">
          <div className="ticker__track">
            {[0, 1].map((index) => (
              <div className="ticker__content" key={index}>
                Landing pages <span>•</span> Business websites <span>•</span>{" "}
                Portfolios <span>•</span> Responsive design <span>•</span>{" "}
                Custom development <span>•</span>
              </div>
            ))}
          </div>
        </div>

        <section className="section" id="services">
          <div className="section-heading reveal">
            <p className="eyebrow">01 / Services</p>
            <h2>
              What Mivo can <span>help with.</span>
            </h2>
            <p className="section-lead">
              Examples of the kind of work I take on — every project is scoped
              individually before we start.
            </p>
          </div>

          <div className="services-grid reveal">
            {SERVICES.map((service, index) => (
              <article className="service-card" key={service.title}>
                <span className="service-card__num">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{service.title}</h3>
                <p>{service.body}</p>
              </article>
            ))}

            <article className="service-card service-card--wide">
              <span className="service-card__num">07</span>
              <h3>Website maintenance</h3>
              <p>
                Ongoing updates, fixes and small improvements after launch —
                available by agreement.
              </p>
            </article>
          </div>

          <p className="section-note reveal">
            Not sure where your project fits? Describe it in an enquiry and
            I&apos;ll tell you honestly what&apos;s involved.
          </p>
        </section>

        <section className="section" id="work">
          <div className="section-heading section-heading--split reveal">
            <div>
              <p className="eyebrow">02 / Work</p>
              <h2>
                Projects I&apos;ve <span>built.</span>
              </h2>
            </div>
            <p className="section-lead section-lead--right">
              A selection of personal and experimental work. Client projects
              will be labelled clearly when added.
            </p>
          </div>

          <div className="projects-grid reveal">
            {projects.map((project) => (
              <ProjectCard key={project.slug} project={project} />
            ))}

            <article className="project-card project-card--cta">
              <div className="project-card__cta-inner">
                <span className="project-card__cta-icon" aria-hidden="true">
                  +
                </span>
                <h3>Your project here</h3>
                <p>
                  Have something in mind? Tell me about it — I&apos;d like to
                  hear what you&apos;re building.
                </p>
                <a href="#quote" className="button button-primary">
                  Get a quote
                </a>
              </div>
            </article>
          </div>
        </section>

        <section className="section section--process" id="process">
          <div className="section-heading reveal">
            <p className="eyebrow">03 / Process</p>
            <h2>
              How a project <span>works.</span>
            </h2>
            <p className="section-lead">
              A clear, structured process so you always know where things stand.
            </p>
          </div>

          <ol className="process-list reveal">
            {PROCESS.map((step, index) => (
              <li className="process-step" key={step.title}>
                <span className="process-step__num">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </li>
            ))}

            <li className="process-step">
              <span className="process-step__num">07</span>
              <div>
                <h3>
                  Maintenance{" "}
                  <span className="process-step__optional">(optional)</span>
                </h3>
                <p>Ongoing support and updates if you need them after launch.</p>
              </div>
            </li>
          </ol>
        </section>

        <section className="section" id="about">
          <div className="section-heading reveal">
            <p className="eyebrow">04 / About</p>
            <h2>
              Small studio. <span>Personal approach.</span>
            </h2>
          </div>

          <div className="about-grid reveal">
            <p className="about-lead">
              Mivo is run by Oliver — a UK-based developer building modern
              websites for businesses and creators.
            </p>

            <div className="about-text">
              <p>
                I focus on clean design, solid front-end development and
                websites that feel tailored to the business behind them — not
                copied from a template.
              </p>
              <p>
                I&apos;m still growing my skills through real projects. For
                anything complex or outside my current capability, I&apos;ll be
                upfront before we agree on scope. That honesty is part of how I
                work.
              </p>
            </div>
          </div>

          <ul className="skills reveal" aria-label="Technologies and tools">
            {SKILLS.map((skill) => (
              <li key={skill}>{skill}</li>
            ))}
          </ul>
        </section>

        <section className="section section--quote" id="quote">
          <div className="section-heading reveal">
            <p className="eyebrow">05 / Get a quote</p>
            <h2>
              Tell me about <span>your project.</span>
            </h2>
            <p className="section-lead">
              Fill in what you can — I&apos;ll review your enquiry and reply with
              what I can offer and a clear quote. No automatic pricing; every
              project is assessed individually.
            </p>
          </div>

          <QuoteForm />
        </section>
      </main>

      <footer className="footer">
        <div className="footer__inner">
          <span>&copy; {new Date().getFullYear()} Mivo</span>
          <nav aria-label="Footer">
            <a href="#quote">Get a quote</a>
            <a href="#home">Back to top</a>
          </nav>
        </div>
      </footer>

      <ScrollReveal />
      <Analytics />
      <OwnerLoginLink />
    </>
  );
}
