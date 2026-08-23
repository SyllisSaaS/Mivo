"use client";

import { useRef, useState } from "react";
import {
  BRANDING_OPTIONS,
  BUDGET_RANGES,
  CONTENT_OPTIONS,
  EXISTING_SITE_OPTIONS,
  LEAD_SOURCES,
  PAGE_COUNTS,
  PROJECT_TYPES,
} from "@/lib/constants";
import { trackEvent } from "@/lib/track";

/**
 * Three-step enquiry form.
 *
 * Submits to /api/enquiries, which re-validates everything server-side.
 * The form only ever shows the visitor a friendly outcome — it never
 * surfaces internal error detail.
 */

const STEPS = ["Contact", "Project", "Details"] as const;

type Errors = Record<string, string>;

const INITIAL = {
  name: "",
  businessName: "",
  email: "",
  website: "",
  social: "",
  projectType: "",
  description: "",
  features: "",
  pageCount: "",
  budget: "",
  deadline: "",
  branding: "",
  contentState: "",
  existingSite: "",
  leadSource: "",
};

type FormState = typeof INITIAL;

const STEP_FIELDS: Record<number, (keyof FormState)[]> = {
  0: ["name", "email"],
  1: ["projectType", "description"],
  2: [],
};

export function QuoteForm() {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");
  const startedAt = useRef<number | null>(null);
  const honeypot = useRef("");

  function update(field: keyof FormState, value: string) {
    if (startedAt.current === null) {
      startedAt.current = Date.now();
      trackEvent("quote_form_started");
    }
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function validateStep(index: number): boolean {
    const next: Errors = {};
    for (const field of STEP_FIELDS[index] ?? []) {
      const value = values[field].trim();
      if (!value) {
        next[field] = "This field is required.";
      }
    }
    if (
      index === 0 &&
      values.email.trim() &&
      !/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(values.email.trim())
    ) {
      next.email = "Please enter a valid email address.";
    }
    if (index === 1 && values.description.trim().length > 0 && values.description.trim().length < 10) {
      next.description = "A little more detail would help.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateStep(step)) return;

    setStatus("sending");
    setMessage("");

    try {
      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          honeypot: honeypot.current,
          elapsedMs: startedAt.current ? Date.now() - startedAt.current : 0,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        errors?: Errors;
        message?: string;
      };

      if (response.ok && data.ok) {
        trackEvent("quote_form_submitted");
        setStatus("sent");
        return;
      }

      if (data.errors && Object.keys(data.errors).length > 0) {
        setErrors(data.errors);
        // Send the visitor back to the step containing the first problem.
        const firstField = Object.keys(data.errors)[0] as keyof FormState;
        const owningStep = Object.entries(STEP_FIELDS).find(([, fields]) =>
          fields.includes(firstField)
        );
        if (owningStep) setStep(Number(owningStep[0]));
        setStatus("idle");
        setMessage("Please check the highlighted fields.");
        return;
      }

      setStatus("error");
      setMessage(
        data.message ??
          "Something went wrong sending your enquiry. Please try again shortly."
      );
    } catch {
      setStatus("error");
      setMessage(
        "Could not reach the server. Please check your connection and try again."
      );
    }
  }

  if (status === "sent") {
    return (
      <div className="form-success reveal reveal--visible" role="status">
        <h3>Enquiry received</h3>
        <p>
          Thanks {values.name.split(" ")[0] || "for getting in touch"} — your
          enquiry is with me now. I read every one personally and usually reply
          within 1–2 working days with what I can offer and a clear quote.
        </p>
        <p>
          If it is urgent, reply to the confirmation thread once you hear from
          me and I will prioritise it.
        </p>
      </div>
    );
  }

  const isLastStep = step === STEPS.length - 1;

  return (
    <form className="quote-form reveal" onSubmit={onSubmit} noValidate>
      <ol className="form-progress" aria-label="Form progress">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={[
              "form-progress__step",
              index === step ? "form-progress__step--active" : "",
              index < step ? "form-progress__step--done" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-current={index === step ? "step" : undefined}
          >
            {label}
          </li>
        ))}
      </ol>

      {/* Step 1 — contact */}
      <fieldset hidden={step !== 0}>
        <legend className="visually-hidden">Contact details</legend>
        <div className="form-grid">
          <Field
            label="Your name"
            required
            error={errors.name}
            name="name"
            value={values.name}
            onChange={update}
            autoComplete="name"
          />
          <Field
            label="Business / brand name"
            name="businessName"
            value={values.businessName}
            onChange={update}
            autoComplete="organization"
          />
          <Field
            label="Email"
            required
            type="email"
            error={errors.email}
            name="email"
            value={values.email}
            onChange={update}
            autoComplete="email"
          />
          <Field
            label="Current website"
            name="website"
            value={values.website}
            onChange={update}
            placeholder="yourbusiness.co.uk"
          />
          <Field
            label="Instagram or social link"
            name="social"
            value={values.social}
            onChange={update}
            placeholder="instagram.com/yourbusiness"
            full
          />
        </div>
      </fieldset>

      {/* Step 2 — project */}
      <fieldset hidden={step !== 1}>
        <legend className="visually-hidden">Project information</legend>
        <div className="form-grid">
          <SelectField
            label="Project type"
            required
            name="projectType"
            value={values.projectType}
            onChange={update}
            options={PROJECT_TYPES}
            placeholder="Choose one"
            error={errors.projectType}
            full
          />
          <TextareaField
            label="What are you looking for?"
            required
            name="description"
            value={values.description}
            onChange={update}
            rows={4}
            placeholder="Describe the site you want — pages, style, goals."
            error={errors.description}
            full
          />
          <SelectField
            label="Existing website?"
            name="existingSite"
            value={values.existingSite}
            onChange={update}
            options={EXISTING_SITE_OPTIONS}
            placeholder="Choose one"
          />
          <SelectField
            label="Approx. number of pages"
            name="pageCount"
            value={values.pageCount}
            onChange={update}
            options={PAGE_COUNTS}
            placeholder="Not sure yet"
          />
          <TextareaField
            label="Important features"
            name="features"
            value={values.features}
            onChange={update}
            rows={3}
            placeholder="Contact form, gallery, booking, shop, blog, etc."
            full
          />
        </div>
      </fieldset>

      {/* Step 3 — details */}
      <fieldset hidden={step !== 2}>
        <legend className="visually-hidden">Additional details</legend>
        <div className="form-grid">
          <SelectField
            label="Existing branding?"
            name="branding"
            value={values.branding}
            onChange={update}
            options={BRANDING_OPTIONS}
            placeholder="Choose one"
          />
          <SelectField
            label="Existing content?"
            name="contentState"
            value={values.contentState}
            onChange={update}
            options={CONTENT_OPTIONS}
            placeholder="Choose one"
          />
          <Field
            label="Deadline"
            name="deadline"
            value={values.deadline}
            onChange={update}
            placeholder="e.g. Before summer, flexible"
          />
          <SelectField
            label="Approximate budget"
            name="budget"
            value={values.budget}
            onChange={update}
            options={BUDGET_RANGES}
            placeholder="Prefer not to say"
          />
          <SelectField
            label="How did you find Mivo?"
            name="leadSource"
            value={values.leadSource}
            onChange={update}
            options={LEAD_SOURCES}
            placeholder="Optional"
            full
          />
        </div>
      </fieldset>

      {/* Bots fill this in; people never see it. */}
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="company-website-url">Leave this empty</label>
        <input
          id="company-website-url"
          name="company-website-url"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          onChange={(event) => {
            honeypot.current = event.target.value;
          }}
        />
      </div>

      <div className="form-actions">
        {step > 0 && (
          <button
            type="button"
            className="button button-secondary"
            onClick={() => setStep((value) => value - 1)}
            disabled={status === "sending"}
          >
            Back
          </button>
        )}

        {!isLastStep && (
          <button
            type="button"
            className="button button-primary"
            onClick={() => {
              if (validateStep(step)) setStep((value) => value + 1);
            }}
          >
            Continue
          </button>
        )}

        {isLastStep && (
          <button
            type="submit"
            className="button button-primary"
            disabled={status === "sending"}
          >
            {status === "sending" ? "Sending…" : "Send enquiry"}
          </button>
        )}
      </div>

      {message && (
        <p
          className={`form-alert${status === "error" ? " form-alert--error" : ""}`}
          role="alert"
        >
          {message}
        </p>
      )}

      <p className="form-note">
        I read every enquiry personally and reply with what I can offer and a
        clear quote — usually within 1–2 working days. Your details are only
        used to respond to this enquiry.
      </p>
    </form>
  );
}

/* ---------- field primitives ---------- */

interface BaseFieldProps {
  label: string;
  name: keyof FormState;
  value: string;
  onChange: (field: keyof FormState, value: string) => void;
  required?: boolean;
  error?: string;
  full?: boolean;
  placeholder?: string;
}

function labelContent(label: string, required?: boolean) {
  return (
    <>
      {label} {required && <span className="required">*</span>}
    </>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  required,
  error,
  full,
  placeholder,
  type = "text",
  autoComplete,
}: BaseFieldProps & { type?: string; autoComplete?: string }) {
  const id = `field-${name}`;
  return (
    <label className={full ? "form-grid__full" : undefined} htmlFor={id}>
      {labelContent(label, required)}
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(name, event.target.value)}
      />
      {error && (
        <span className="field-error" id={`${id}-error`}>
          {error}
        </span>
      )}
    </label>
  );
}

function SelectField({
  label,
  name,
  value,
  onChange,
  required,
  error,
  full,
  options,
  placeholder,
}: BaseFieldProps & { options: readonly string[] }) {
  const id = `field-${name}`;
  return (
    <label className={full ? "form-grid__full" : undefined} htmlFor={id}>
      {labelContent(label, required)}
      <select
        id={id}
        name={name}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(name, event.target.value)}
      >
        <option value="">{placeholder ?? "Choose one"}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error && (
        <span className="field-error" id={`${id}-error`}>
          {error}
        </span>
      )}
    </label>
  );
}

function TextareaField({
  label,
  name,
  value,
  onChange,
  required,
  error,
  full,
  placeholder,
  rows = 3,
}: BaseFieldProps & { rows?: number }) {
  const id = `field-${name}`;
  return (
    <label className={full ? "form-grid__full" : undefined} htmlFor={id}>
      {labelContent(label, required)}
      <textarea
        id={id}
        name={name}
        rows={rows}
        value={value}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(name, event.target.value)}
      />
      {error && (
        <span className="field-error" id={`${id}-error`}>
          {error}
        </span>
      )}
    </label>
  );
}
