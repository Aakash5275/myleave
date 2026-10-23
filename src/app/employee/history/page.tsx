import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { Empty, Field, FilterBar, PageHeader, inputClass } from "@/components/ui";
import { LEAVE_TYPES, REQUEST_STATUSES } from "@/lib/constants";
import { requireSelf } from "@/lib/auth";
import { formatDate, formatDateTime, matchesQuery, queryValue } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "History" };

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireSelf();
  const params = await searchParams;
  const q = queryValue(params.q);
  const status = queryValue(params.status);
  const kind = queryValue(params.kind);
  const [leaves, hr, docs] = await Promise.all([
    prisma.leaveRequest.findMany({ where: { userId: user.id, type: { in: [...LEAVE_TYPES] } } }),
    prisma.hrRequest.findMany({ where: { userId: user.id } }),
    prisma.documentRequest.findMany({ where: { userId: user.id } }),
  ]);
  const items = [
    ...leaves.map((item) => ({
      id: item.id,
      kind: "Leave",
      title: `${item.type} leave · ${item.days} day(s)`,
      detail: `${formatDate(item.startDate)} – ${formatDate(item.endDate)}. ${item.reason}${item.adminNote ? ` HR: ${item.adminNote}` : ""}`,
      status: item.status,
      createdAt: item.createdAt,
      href: "/employee/leave",
    })),
    ...hr.map((item) => ({
      id: item.id,
      kind: "HR request",
      title: item.subject,
      detail: `${item.category} · ${item.priority}. ${item.description}${item.adminNote ? ` HR: ${item.adminNote}` : ""}`,
      status: item.status,
      createdAt: item.createdAt,
      href: "/employee/requests",
    })),
    ...docs.map((item) => ({
      id: item.id,
      kind: "Document",
      title: item.docType,
      detail: `${item.purpose}${item.adminNote ? ` HR: ${item.adminNote}` : ""}`,
      status: item.status,
      createdAt: item.createdAt,
      href: "/employee/documents",
    })),
  ]
    .filter((item) => {
      if (kind && item.kind !== kind) return false;
      if (status && item.status !== status) return false;
      return matchesQuery(q, [item.kind, item.title, item.detail, item.status]);
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Record" title="Request history" description="Every leave, HR, and document request you have submitted." />
      <FilterBar clearHref="/employee/history">
        <Field label="Search">
          <input className={inputClass} name="q" defaultValue={q} placeholder="Search history" />
        </Field>
        <Field label="Type">
          <select className={inputClass} name="kind" defaultValue={kind}>
            <option value="">All</option>
            <option>Leave</option>
            <option>HR request</option>
            <option>Document</option>
          </select>
        </Field>
        <Field label="Status">
          <select className={inputClass} name="status" defaultValue={status}>
            <option value="">All</option>
            {REQUEST_STATUSES.map((item) => <option key={item}>{item}</option>)}
          </select>
        </Field>
      </FilterBar>
      {items.length ? (
        <ol className="space-y-3">
          {items.map((item) => (
            <li key={`${item.kind}-${item.id}`} className="rounded-2xl border border-line bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-teal">{item.kind}</p>
                <StatusBadge value={item.status} />
              </div>
              <p className="mt-2 font-semibold">{item.title}</p>
              <p className="mt-1 text-sm text-mist">{item.detail}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-mist">
                <span>{formatDateTime(item.createdAt)}</span>
                <Link className="font-semibold text-teal" href={item.href}>Open</Link>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <Empty title="Nothing in history yet" body="Submitted requests will collect here." />
      )}
    </div>
  );
}
