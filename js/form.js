const QUOTE_EMAIL = "oliverday015@gmail.com";

function initQuoteForm() {
  const form = document.getElementById("quoteForm");
  if (!form) return;

  const steps = [...form.querySelectorAll(".form-step")];
  const stepIndicators = [...form.querySelectorAll(".form-progress__step")];
  const prevBtn = form.querySelector("[data-action='prev']");
  const nextBtn = form.querySelector("[data-action='next']");
  const submitBtn = form.querySelector("[data-action='submit']");
  let currentStep = 0;

  function updateStepUI() {
    steps.forEach((step, i) => {
      step.hidden = i !== currentStep;
      step.classList.toggle("form-step--active", i === currentStep);
    });

    stepIndicators.forEach((indicator, i) => {
      indicator.classList.toggle("form-progress__step--active", i === currentStep);
      indicator.classList.toggle("form-progress__step--done", i < currentStep);
    });

    if (prevBtn) prevBtn.hidden = currentStep === 0;
    if (nextBtn) nextBtn.hidden = currentStep === steps.length - 1;
    if (submitBtn) submitBtn.hidden = currentStep !== steps.length - 1;
  }

  function validateStep(index) {
    const step = steps[index];
    const fields = step.querySelectorAll("input, select, textarea");
    let valid = true;

    fields.forEach((field) => {
      if (!field.checkValidity()) {
        valid = false;
        field.reportValidity();
      }
    });

    return valid;
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (!validateStep(currentStep)) return;
      if (currentStep < steps.length - 1) {
        currentStep += 1;
        updateStepUI();
        steps[currentStep].querySelector("input, select, textarea")?.focus();
      }
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (currentStep > 0) {
        currentStep -= 1;
        updateStepUI();
      }
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!validateStep(currentStep)) return;

    const data = new FormData(form);
    const lines = [];

    const add = (label, key) => {
      const value = (data.get(key) || "").toString().trim();
      if (value) lines.push(`${label}: ${value}`);
    };

    lines.push("— CONTACT —");
    add("Name", "name");
    add("Business", "business");
    add("Email", "email");
    add("Website", "website");
    add("Social", "social");

    lines.push("", "— PROJECT —");
    add("Project type", "projectType");
    add("What they do", "businessDescription");
    add("Looking for", "projectGoal");
    add("Existing website", "existingSite");
    add("Approx. pages", "pageCount");
    add("Important features", "features");

    lines.push("", "— DETAILS —");
    add("Existing branding", "branding");
    add("Existing content", "content");
    add("Deadline", "deadline");
    add("Budget", "budget");
    add("Additional notes", "notes");

    const subject = encodeURIComponent("Mivo project enquiry");
    const body = encodeURIComponent(lines.join("\n"));

    window.location.href = `mailto:${QUOTE_EMAIL}?subject=${subject}&body=${body}`;
  });

  updateStepUI();
}

document.addEventListener("DOMContentLoaded", initQuoteForm);
