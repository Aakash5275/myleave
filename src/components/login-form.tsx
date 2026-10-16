"use client";

import { useActionState, useState } from "react";
import { login } from "@/server/auth-actions";
import { btnPrimary, inputClass } from "@/components/ui";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-panel px-10 py-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-teal font-bold">ML</span>
          <span className="text-lg font-semibold">MyLeave</span>
        </div>
        <div>
          <h1 className="max-w-md text-4xl font-semibold tracking-tight">HR requests, leave, and payroll in one calm workspace.</h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/70">
            Employees submit. Admins review. Status changes come back as notifications.
          </p>
          <ol className="mt-8 space-y-3 text-sm text-white/80">
            <li>1. Employee sends leave, HR, or document requests</li>
            <li>2. Admin moves them through review</li>
            <li>3. The employee sees the result immediately</li>
          </ol>
        </div>
        <p className="text-xs text-white/40">Passwords are hashed. Sessions stay in an httpOnly cookie.</p>
      </section>
      <section className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-teal font-bold text-white">ML</span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">Sign in to MyLeave</h1>
          </div>
          <h2 className="hidden text-3xl font-semibold tracking-tight lg:block">Sign in</h2>
          <p className="mt-2 text-sm text-mist">Use the work email and password issued by HR.</p>
          <form action={action} className="mt-6 space-y-4">
            <label className="block text-sm font-medium">
              Email
              <input
                className={`${inputClass} mt-1.5`}
                name="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label className="block text-sm font-medium">
              Password
              <input
                className={`${inputClass} mt-1.5`}
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            {state?.error ? <p className="text-sm text-rose-600">{state.error}</p> : null}
            <button className={`${btnPrimary} w-full`} type="submit" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
