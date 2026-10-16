const tones: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-800 ring-amber-200",
  "In Progress": "bg-sky-50 text-sky-800 ring-sky-200",
  Approved: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  Rejected: "bg-rose-50 text-rose-700 ring-rose-200",
  Resolved: "bg-teal/10 text-teal ring-teal/20",
  Present: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  Late: "bg-amber-50 text-amber-800 ring-amber-200",
  "Half Day": "bg-violet-50 text-violet-800 ring-violet-200",
  Absent: "bg-rose-50 text-rose-700 ring-rose-200",
  "On Leave": "bg-sky-50 text-sky-800 ring-sky-200",
  Active: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  Inactive: "bg-stone-100 text-stone-600 ring-stone-200",
  Draft: "bg-stone-100 text-stone-600 ring-stone-200",
  Issued: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  High: "bg-rose-50 text-rose-700 ring-rose-200",
  Medium: "bg-amber-50 text-amber-800 ring-amber-200",
  Low: "bg-slate-100 text-slate-700 ring-slate-200",
  "Not marked": "bg-stone-100 text-stone-600 ring-stone-200",
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${tones[value] ?? "bg-slate-100 text-slate-700 ring-slate-200"}`}>
      {value}
    </span>
  );
}
