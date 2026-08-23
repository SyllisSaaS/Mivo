import { Resend } from "resend";
import { env, isEmailConfigured } from "./env";
import type { EnquiryInput } from "./validation";

/**
 * Server-side email delivery.
 *
 * The API key never leaves the server. Failures are logged and swallowed:
 * an enquiry that is safely stored must not be reported as failed just
 * because the notification email could not be sent.
 */

let client: Resend | null = null;

function getClient(): Resend | null {
  const key = env.resendApiKey;
  if (!key) return null;
  if (!client) {
    client = new Resend(key);
  }
  return client;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendEnquiryNotification(
  enquiry: EnquiryInput,
  enquiryId: number | null
): Promise<boolean> {
  const resend = getClient();
  if (!resend || !isEmailConfigured()) return false;

  const rows: [string, string | undefined][] = [
    ["Name", enquiry.name],
    ["Business", enquiry.businessName],
    ["Email", enquiry.email],
    ["Website", enquiry.website],
    ["Social", enquiry.social],
    ["Project type", enquiry.projectType],
    ["Pages", enquiry.pageCount],
    ["Budget", enquiry.budget],
    ["Deadline", enquiry.deadline],
    ["Existing site", enquiry.existingSite],
    ["Branding", enquiry.branding],
    ["Content", enquiry.contentState],
    ["Lead source", enquiry.leadSource],
  ];

  const detailRows = rows
    .filter(([, value]) => Boolean(value))
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#666;">${label}</td><td style="padding:4px 0;">${escapeHtml(
          value as string
        )}</td></tr>`
    )
    .join("");

  // The admin link requires authentication to open — it leaks nothing.
  const adminLink = enquiryId
    ? `${env.siteUrl.replace(/\/$/, "")}/admin/enquiries/${enquiryId}`
    : `${env.siteUrl.replace(/\/$/, "")}/admin/enquiries`;

  const subject = `New enquiry — ${enquiry.projectType} — ${
    enquiry.businessName || enquiry.name
  }`;

  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.6;color:#111;">
      <h2 style="margin:0 0 16px;">New Mivo enquiry</h2>
      <table style="border-collapse:collapse;font-size:14px;">${detailRows}</table>
      <h3 style="margin:24px 0 8px;font-size:14px;">Project description</h3>
      <p style="white-space:pre-wrap;font-size:14px;">${escapeHtml(
        enquiry.description
      )}</p>
      ${
        enquiry.features
          ? `<h3 style="margin:24px 0 8px;font-size:14px;">Requested features</h3>
             <p style="white-space:pre-wrap;font-size:14px;">${escapeHtml(
               enquiry.features
             )}</p>`
          : ""
      }
      <p style="margin-top:28px;font-size:14px;">
        <a href="${adminLink}">Open in the Mivo admin</a>
      </p>
    </div>
  `;

  try {
    const result = await resend.emails.send({
      from: env.emailFrom as string,
      to: env.emailTo as string,
      replyTo: enquiry.email,
      subject,
      html,
    });
    if (result.error) {
      console.error("[email] delivery rejected", result.error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[email] delivery failed", error);
    return false;
  }
}

export { isEmailConfigured };
