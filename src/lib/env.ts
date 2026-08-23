/**
 * Server-only environment access.
 *
 * Nothing in this file may be imported into a Client Component.
 * Values are read lazily so that the public site still builds and
 * runs when the admin-related variables are absent.
 */

function read(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export const env = {
  get databaseUrl() {
    return read("DATABASE_URL");
  },
  get authSecret() {
    return read("AUTH_SECRET");
  },
  get adminEmail() {
    return read("ADMIN_EMAIL")?.toLowerCase();
  },
  get adminPasswordHash() {
    return read("ADMIN_PASSWORD_HASH");
  },
  get resendApiKey() {
    return read("RESEND_API_KEY");
  },
  get emailFrom() {
    return read("EMAIL_FROM");
  },
  get emailTo() {
    return read("EMAIL_TO");
  },
  get ipHashSalt() {
    return read("IP_HASH_SALT");
  },
  get siteUrl() {
    return read("NEXT_PUBLIC_SITE_URL") ?? "http://localhost:3000";
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
};

export function isDatabaseConfigured(): boolean {
  return Boolean(env.databaseUrl);
}

export function isAuthConfigured(): boolean {
  return Boolean(env.authSecret && env.adminEmail && env.adminPasswordHash);
}

export function isEmailConfigured(): boolean {
  return Boolean(env.resendApiKey && env.emailFrom && env.emailTo);
}

/**
 * Lists the configuration gaps that would stop the admin area working.
 * Used by the settings page — reports names only, never values.
 */
export function adminConfigStatus() {
  return [
    { name: "DATABASE_URL", set: Boolean(env.databaseUrl), required: true },
    { name: "AUTH_SECRET", set: Boolean(env.authSecret), required: true },
    { name: "ADMIN_EMAIL", set: Boolean(env.adminEmail), required: true },
    {
      name: "ADMIN_PASSWORD_HASH",
      set: Boolean(env.adminPasswordHash),
      required: true,
    },
    { name: "RESEND_API_KEY", set: Boolean(env.resendApiKey), required: false },
    { name: "EMAIL_FROM", set: Boolean(env.emailFrom), required: false },
    { name: "EMAIL_TO", set: Boolean(env.emailTo), required: false },
    { name: "IP_HASH_SALT", set: Boolean(env.ipHashSalt), required: false },
  ];
}
