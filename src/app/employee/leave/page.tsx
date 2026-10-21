import { CancelLeaveButton, LeaveApplyButton } from "@/components/employee-forms";
import { StatusBadge } from "@/components/status-badge";
import { Empty, Field, FilterBar, PageHeader, inputClass, td, th } from "@/components/ui";
import { LEAVE_TYPES, REQUEST_STATUSES } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { formatDate, matchesQuery, queryValue, yearOf } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Leave" };

export default async function LeavePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser("EMPLOYEE");
  const params = await searchParams;
  const q = queryValue(params.q);
  const status = queryValue(params.status);
  const type = queryValue(params.type);
  const year = yearOf();
  const [balances, requests] = await Promise.all([
    prisma.leaveBalance.findMany({
      where: { userId: user.id, year },
      select: { id: true, type: true, total: true, used: true },
      orderBy: { type: "asc" },
    }),
    prisma.leaveRequest.findMany({
      where: { userId: user.id, ...(status ? { status } : {}), ...(type ? { type } : {}) },
      select: { id: true, type: true, startDate: true, endDate: true, days: true, reason: true, status: true, adminNote: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const pendingByType = new Map<string, number>();
  for (const request of requests) {
    if (request.status === "Pending" || request.status === "In Progress") {
      pendingByType.set(request.type, (pendingByType.get(request.type) ?? 0) + request.days);
    }
  }
  const visible = requests.filter((request) => matchesQuery(q, [request.type, request.reason, request.status, request.adminNote]));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Time off"
        title="Leave"
        description="Balances update when HR approves a request. You can withdraw your own leave, and that does not notify anyone."
        action={<LeaveApplyButton />}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {balances.map((balance) => {
          const pending = pendingByType.get(balance.type) ?? 0;
          const left = balance.type === "Unpaid" ? null : balance.total - balance.used - pending;
          return (
            <div key={balance.id} className="rounded-2xl border border-line bg-white p-4 shadow-sm">
              <p className="text-sm text-mist">{balance.type}</p>
              <p className="mt-1 text-2xl font-semibold">{left === null ? "No cap" : left}</p>
              <p className="text-xs text-mist">{balance.used} used · {pending} pending</p>
            </div>
          );
        })}
      </div>
      <FilterBar clearHref="/employee/leave">
        <Field label="Search">
          <input className={inputClass} name="q" defaultValue={q} placeholder="Reason or note" />
        </Field>
        <Field label="Type">
          <select className={inputClass} name="type" defaultValue={type}>
            <option value="">All</option>
            {LEAVE_TYPES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select className={inputClass} name="status" defaultValue={status}>
            <option value="">All</option>
            {REQUEST_STATUSES.map((item) => (
              <option key={item}>{item}</option>
            ))}
            <option>Cancelled</option>
          </select>
        </Field>
      </FilterBar>
      {visible.length ? (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr>
                <th className={th}>Type</th>
                <th className={th}>Dates</th>
                <th className={th}>Days</th>
                <th className={th}>Reason</th>
                <th className={th}>Status</th>
                <th className={th}> </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((request) => (
                <tr key={request.id}>
                  <td className={td}>{request.type}</td>
                  <td className={td}>{formatDate(request.startDate)} – {formatDate(request.endDate)}</td>
                  <td className={td}>{request.days}</td>
                  <td className={td}>
                    <p>{request.reason}</p>
                    {request.adminNote ? <p className="mt-1 text-mist">HR: {request.adminNote}</p> : null}
                  </td>
                  <td className={td}><StatusBadge value={request.status} /></td>
                  <td className={td}>
                    {request.status === "Rejected" || request.status === "Cancelled" ? null : (
                      <CancelLeaveButton id={request.id} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="No leave requests" body="Apply for leave when you need time away." />
      )}
    </div>
  );
}
