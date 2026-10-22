import Link from "next/link";
import { ReviewForm } from "@/components/review-form";
import { StatusBadge } from "@/components/status-badge";
import { Empty, Field, FilterBar, PageHeader, inputClass } from "@/components/ui";
import { LEAVE_TYPES, REQUEST_STATUSES } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { formatDate, fullName, matchesQuery, queryValue, yearOf } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { reviewLeave } from "@/server/admin-actions";

export const metadata = { title: "Leave approvals" };

export default async function AdminLeavePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser("ADMIN");
  const params = await searchParams;
  const q = queryValue(params.q);
  const status = queryValue(params.status);
  const type = queryValue(params.type);
  const year = yearOf();
  const [requests, balances] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { type: { in: [...LEAVE_TYPES] }, ...(status ? { status } : {}), ...(type ? { type } : {}) },
      select: {
        id: true,
        userId: true,
        type: true,
        startDate: true,
        endDate: true,
        days: true,
        reason: true,
        status: true,
        adminNote: true,
        user: { select: { firstName: true, lastName: true, employeeCode: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.leaveBalance.findMany({ where: { year }, select: { userId: true, type: true, total: true, used: true } }),
  ]);
  const balanceKey = (userId: string, leaveType: string) => `${userId}:${leaveType}`;
  const balanceMap = new Map(balances.map((balance) => [balanceKey(balance.userId, balance.type), balance]));
  const visible = requests.filter((request) =>
    matchesQuery(q, [fullName(request.user), request.user.employeeCode, request.type, request.reason, request.status]),
  );

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Approvals" title="Leave" description="Approve, reject, or keep a request in progress. Approval deducts the balance and blocks those working days." />
      <FilterBar clearHref="/admin/leave">
        <Field label="Search">
          <input className={inputClass} name="q" defaultValue={q} placeholder="Employee or reason" />
        </Field>
        <Field label="Type">
          <select className={inputClass} name="type" defaultValue={type}>
            <option value="">All</option>
            {LEAVE_TYPES.map((item) => <option key={item}>{item}</option>)}
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
          {visible.map((request) => {
            const balance = balanceMap.get(balanceKey(request.userId, request.type));
            const left = !balance || request.type === "Unpaid" ? "No cap" : balance.total - balance.used;
            return (
              <article key={request.id} className="grid gap-4 rounded-2xl border border-line bg-white p-4 shadow-sm lg:grid-cols-[1.4fr_0.8fr]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link className="font-semibold text-teal" href={`/admin/employees/${request.userId}`}>{fullName(request.user)}</Link>
                    <StatusBadge value={request.status} />
                  </div>
                  <p className="mt-2 text-sm">{request.type} · {request.days} working day(s) · {left} left before this decision</p>
                  <p className="text-sm text-mist">{formatDate(request.startDate)} – {formatDate(request.endDate)}</p>
                  <p className="mt-2 text-sm">{request.reason}</p>
                </div>
                <ReviewForm action={reviewLeave} id={request.id} status={request.status} note={request.adminNote} />
              </article>
            );
          })}
        </div>
      ) : (
        <Empty title="No leave requests" body="New applications from employees will show up here." />
      )}
    </div>
  );
}
