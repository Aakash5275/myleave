import Link from "next/link";
import { ReviewForm } from "@/components/review-form";
import { StatusBadge } from "@/components/status-badge";
import { Empty, Field, FilterBar, PageHeader, inputClass } from "@/components/ui";
import { HR_CATEGORIES, PRIORITIES, REQUEST_STATUSES } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { formatDateTime, fullName, matchesQuery, queryValue } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { reviewHr } from "@/server/admin-actions";

export const metadata = { title: "HR tickets" };

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser("ADMIN");
  const params = await searchParams;
  const q = queryValue(params.q);
  const status = queryValue(params.status);
  const category = queryValue(params.category);
  const priority = queryValue(params.priority);
  const requests = await prisma.hrRequest.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
  const visible = requests.filter((request) => {
    if (status && request.status !== status) return false;
    if (category && request.category !== category) return false;
    if (priority && request.priority !== priority) return false;
    return matchesQuery(q, [fullName(request.user), request.subject, request.description, request.category]);
  });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Tickets" title="HR requests" description="Move a ticket from pending to in progress, then resolve, approve, or reject it. The employee is notified." />
      <FilterBar clearHref="/admin/requests">
        <Field label="Search">
          <input className={inputClass} name="q" defaultValue={q} placeholder="Employee or subject" />
        </Field>
        <Field label="Category">
          <select className={inputClass} name="category" defaultValue={category}>
            <option value="">All</option>
            {HR_CATEGORIES.map((item) => <option key={item}>{item}</option>)}
          </select>
        </Field>
        <Field label="Priority">
          <select className={inputClass} name="priority" defaultValue={priority}>
            <option value="">All</option>
            {PRIORITIES.map((item) => <option key={item}>{item}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className={inputClass} name="status" defaultValue={status}>
            <option value="">All</option>
            {REQUEST_STATUSES.map((item) => <option key={item}>{item}</option>)}
          </select>
        </Field>
      </FilterBar>
      {visible.length ? (
        <div className="space-y-3">
          {visible.map((request) => (
            <article key={request.id} className="grid gap-4 rounded-2xl border border-line bg-white p-4 shadow-sm lg:grid-cols-[1.4fr_0.8fr]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{request.subject}</p>
                  <StatusBadge value={request.priority} />
                  <StatusBadge value={request.status} />
                </div>
                <p className="mt-1 text-sm text-mist">
                  <Link className="font-medium text-teal" href={`/admin/employees/${request.userId}`}>{fullName(request.user)}</Link>
                  {" · "}{request.category} · {formatDateTime(request.createdAt)}
                </p>
                <p className="mt-2 text-sm">{request.description}</p>
              </div>
              <ReviewForm action={reviewHr} id={request.id} status={request.status} note={request.adminNote} />
            </article>
          ))}
        </div>
      ) : (
        <Empty title="No tickets" body="Employee HR requests will queue here." />
      )}
    </div>
  );
}
