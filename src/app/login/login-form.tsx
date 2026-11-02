"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const field =
  "mt-2 block w-full border border-rule bg-paper px-3 py-2 font-mono text-sm outline-none focus:border-ink";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="label text-muted">Email</span>
        <input type="email" name="email" required autoFocus autoComplete="username" className={field} />
      </label>
      <label className="block">
        <span className="label text-muted">Password</span>
        <input type="password" name="password" required autoComplete="current-password" className={field} />
      </label>
      {state.error && <p className="text-sm text-alert" role="alert">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="label border border-ink bg-ink px-4 py-2 text-paper hover:bg-paper hover:text-ink disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
