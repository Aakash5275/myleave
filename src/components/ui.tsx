import type { ReactNode } from "react";

export const inputClass =
  "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none ring-teal/30 placeholder:text-mist/70 focus:ring-2";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal/90 disabled:cursor-not-allowed disabled:opacity-60";

export const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-sand disabled:opacity-60";

export const btnDanger =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60";

export const th = "px-3 py-2 text-xs font-semibold uppercase tracking-wide text-mist";
export const td = "border-t border-line px-3 py-3 align-top";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">{eyebrow}</p>
        ) : null}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-mist">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "teal",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "teal" | "amber" | "rose" | "ink";
}) {
  const bar = {
    teal: "bg-teal",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    ink: "bg-ink",
  }[tone];
  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
      <div className={`mb-3 h-1 w-8 rounded-full ${bar}`} />
      <p className="text-sm text-mist">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-mist">{hint}</p> : null}
    </div>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-line bg-white p-5 shadow-sm ${className}`}>
      {title ? (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            {description ? <p className="mt-1 text-sm text-mist">{description}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex min-w-[10rem] flex-1 flex-col gap-1.5 text-sm ${className}`}>
      <span className="font-medium text-ink/80">{label}</span>
      {children}
    </label>
  );
}

export function FilterBar({
  children,
  clearHref,
}: {
  children: ReactNode;
  clearHref: string;
}) {
  return (
    <form method="get" className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm">
      {children}
      <button className={btnPrimary} type="submit">
        Apply
      </button>
      <a className={btnSecondary} href={clearHref}>
        Clear
      </a>
    </form>
  );
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-sand/60 px-4 py-8 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-mist">{body}</p>
    </div>
  );
}

export function Workflow() {
  const steps = ["Employee submits", "Admin reviews", "Status and notification"];
  return (
    <ol className="grid gap-2 sm:grid-cols-3">
      {steps.map((step, index) => (
        <li key={step} className="rounded-2xl border border-line bg-white px-4 py-3 text-sm shadow-sm">
          <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-teal/10 text-xs font-semibold text-teal">
            {index + 1}
          </span>
          {step}
        </li>
      ))}
    </ol>
  );
}

export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">{children}</table>
    </div>
  );
}
