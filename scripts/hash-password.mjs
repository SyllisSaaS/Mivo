#!/usr/bin/env node
/**
 * Generates a bcrypt hash for the admin password.
 *
 *   npm run admin:hash
 *
 * The password is read from a hidden prompt so it never appears in your shell
 * history, and only the hash is printed. Put the hash in ADMIN_PASSWORD_HASH.
 */

import bcrypt from "bcryptjs";
import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";

const ROUNDS = 12;
const MIN_LENGTH = 12;

function prompt(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: stdin, output: stdout, terminal: true });

    if (hidden) {
      // Suppress echo so the password is not shown while typing.
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
      resolve(answer);
    });
  });
}

const password = await prompt("Password: ", { hidden: true });

if (password.length < MIN_LENGTH) {
  console.error(
    `\nPassword must be at least ${MIN_LENGTH} characters. Nothing was generated.`
  );
  process.exit(1);
}

const confirm = await prompt("Confirm password: ", { hidden: true });

if (password !== confirm) {
  console.error("\nPasswords did not match. Nothing was generated.");
  process.exit(1);
}

const hash = await bcrypt.hash(password, ROUNDS);

console.log("\nAdd this to your environment as ADMIN_PASSWORD_HASH:\n");
console.log(hash);
console.log(
  "\nThen run `npm run db:setup` so the account row matches the new hash."
);
console.log("Never commit the hash or the password to Git.\n");
