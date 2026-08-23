#!/usr/bin/env node
/**
 * Interactive first-time setup for Mivo admin.
 *
 *   npm run setup
 *
 * Walks you through the three things still needed:
 *   1. Database connection string (Neon)
 *   2. Your admin email + password
 *   3. Creating tables and your owner account
 *
 * Secrets are written to .env.local only — never printed after entry.
 */

import bcrypt from "bcryptjs";
import { readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const ENV_PATH = path.join(ROOT, ".env.local");
const ROUNDS = 12;
const MIN_PASSWORD = 12;

function prompt(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: stdin, output: stdout, terminal: true });

    if (hidden) {
      const onData = (char) => {
        const text = char.toString();
        if (text === "\n" || text === "\r" || text === "\u0004") {
          stdin.removeListener("data", onData);
        } else {
          stdout.clearLine(0);
          stdout.cursorTo(0);
          stdout.write(`${question}${"*".repeat(rl.line.length)}`);
        }
      };
      stdin.on("data", onData);
    }

    rl.question(question, (answer) => {
      rl.close();
      if (hidden) stdout.write("\n");
      resolve(answer.trim());
    });
  });
}

function parseEnv(text) {
  const map = new Map();
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) map.set(m[1], m[2]);
  }
  return map;
}

function setEnvValue(text, key, value) {
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(text)) return text.replace(re, `${key}=${value}`);
  return `${text.trimEnd()}\n${key}=${value}\n`;
}

function isFilled(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function looksLikeBcrypt(hash) {
  return typeof hash === "string" && hash.startsWith("$2");
}

async function main() {
  stdout.write("\n");
  stdout.write("╔══════════════════════════════════════════════════════════╗\n");
  stdout.write("║  Mivo setup — get the admin area working                 ║\n");
  stdout.write("╚══════════════════════════════════════════════════════════╝\n\n");

  stdout.write("Your public website already works. This script sets up:\n");
  stdout.write("  • a database to store enquiries\n");
  stdout.write("  • your private login at /admin\n\n");

  let envText;
  try {
    envText = await readFile(ENV_PATH, "utf8");
  } catch {
    stdout.write("No .env.local found — copying from .env.example…\n");
    envText = await readFile(path.join(ROOT, ".env.example"), "utf8");
  }

  const env = parseEnv(envText);

  // --- Step 1: Database ---
  stdout.write("── Step 1 of 3: Database ──────────────────────────────────\n\n");
  if (isFilled(env.get("DATABASE_URL"))) {
    stdout.write("✓ DATABASE_URL is already set.\n\n");
  } else {
    stdout.write("You need a free Postgres database from Neon:\n");
    stdout.write("  1. Go to https://neon.tech and sign up\n");
    stdout.write("  2. Create a project (any name is fine)\n");
    stdout.write("  3. On the dashboard, click \"Connection string\"\n");
    stdout.write("  4. Copy the string that starts with postgresql://\n\n");

    const url = await prompt("Paste your DATABASE_URL here: ");
    if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) {
      stdout.write("\nThat doesn't look like a Postgres URL. Setup stopped.\n");
      process.exit(1);
    }
    envText = setEnvValue(envText, "DATABASE_URL", url);
    env.set("DATABASE_URL", url);
    stdout.write("✓ Saved DATABASE_URL to .env.local\n\n");
  }

  // --- Step 2: Admin account ---
  stdout.write("── Step 2 of 3: Your admin login ──────────────────────────\n\n");

  if (!isFilled(env.get("ADMIN_EMAIL"))) {
    const email = await prompt("Your email (this is your admin username): ");
    if (!email.includes("@")) {
      stdout.write("\nThat doesn't look like an email. Setup stopped.\n");
      process.exit(1);
    }
    envText = setEnvValue(envText, "ADMIN_EMAIL", email);
    env.set("ADMIN_EMAIL", email);
    stdout.write("✓ Saved ADMIN_EMAIL\n");
  } else {
    stdout.write(`✓ ADMIN_EMAIL is already set (${env.get("ADMIN_EMAIL")})\n`);
  }

  if (!looksLikeBcrypt(env.get("ADMIN_PASSWORD_HASH"))) {
    stdout.write("\nChoose a password for /admin/login (min 12 characters).\n");
    stdout.write("You'll type it twice — it won't be shown on screen.\n\n");

    const password = await prompt("Password: ", { hidden: true });
    if (password.length < MIN_PASSWORD) {
      stdout.write(`\nPassword must be at least ${MIN_PASSWORD} characters. Setup stopped.\n`);
      process.exit(1);
    }
    const confirm = await prompt("Confirm password: ", { hidden: true });
    if (password !== confirm) {
      stdout.write("\nPasswords didn't match. Setup stopped.\n");
      process.exit(1);
    }

    stdout.write("\nGenerating secure hash…\n");
    const hash = await bcrypt.hash(password, ROUNDS);
    envText = setEnvValue(envText, "ADMIN_PASSWORD_HASH", hash);
    env.set("ADMIN_PASSWORD_HASH", hash);
    stdout.write("✓ Password hash saved (your password itself is never stored)\n\n");
  } else {
    stdout.write("✓ ADMIN_PASSWORD_HASH is already set\n\n");
  }

  await writeFile(ENV_PATH, envText);

  // Ensure auth secrets exist
  const crypto = await import("node:crypto");
  if (!isFilled(env.get("AUTH_SECRET"))) {
    envText = setEnvValue(envText, "AUTH_SECRET", crypto.randomBytes(48).toString("base64"));
  }
  if (!isFilled(env.get("IP_HASH_SALT"))) {
    envText = setEnvValue(envText, "IP_HASH_SALT", crypto.randomBytes(32).toString("base64"));
  }
  await writeFile(ENV_PATH, envText);

  // --- Step 3: Create tables ---
  stdout.write("── Step 3 of 3: Create database tables ────────────────────\n\n");
  stdout.write("Running db:setup…\n\n");

  await new Promise((resolve, reject) => {
    const child = spawn("node", ["scripts/db-setup.mjs"], {
      cwd: ROOT,
      stdio: "inherit",
      env: process.env,
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`db:setup exited with code ${code}`));
    });
  });

  stdout.write("\n");
  stdout.write("╔══════════════════════════════════════════════════════════╗\n");
  stdout.write("║  Done!                                                   ║\n");
  stdout.write("╚══════════════════════════════════════════════════════════╝\n\n");
  stdout.write("Start the site:\n\n");
  stdout.write("  npm run dev\n\n");
  stdout.write("Then open:\n\n");
  stdout.write("  Public site:  http://localhost:3000\n");
  stdout.write("  Admin login:  http://localhost:3000/admin/login\n\n");
  stdout.write("Sign in with the email and password you just chose.\n");
  stdout.write("Submit a test enquiry on the public site — it should appear in Admin → Enquiries.\n\n");
  stdout.write("Email notifications are optional. Skip Resend for now if you want.\n\n");
}

main().catch((error) => {
  console.error("\nSetup failed:", error.message);
  process.exit(1);
});
