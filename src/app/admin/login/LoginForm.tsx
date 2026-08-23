"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "./actions";

const INITIAL: LoginState = {};

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(signIn, INITIAL);

  return (
    <form className="admin-login__form" action={formAction}>
      {next && <input type="hidden" name="next" value={next} />}

      <label className="admin-field">
        <span>Email</span>
        <input
          type="email"
          name="email"
          autoComplete="username"
          required
          autoFocus
        />
      </label>

      <label className="admin-field">
        <span>Password</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
        />
      </label>

      {state.error && (
        <p className="admin-notice admin-notice--error" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        className="admin-button admin-button--primary"
        disabled={pending}
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
