import { HrRequestButton } from "@/components/employee-forms";
import { StatusBadge } from "@/components/status-badge";
import { Empty, Field, FilterBar, PageHeader, inputClass, td, th } from "@/components/ui";
import { HR_CATEGORIES, PRIORITIES, REQUEST_STATUSES } from "@/lib/constants";
import { requireSelf } from "@/lib/auth";
import { formatDateTime, matchesQuery, queryValue } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "HR requests" };

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireSelf();
  const params = await searchParams;
  const q = queryValue(params.q);
  const status = queryValue(params.status);
  const category = queryValue(params.category);
  const priority = queryValue(params.priority);
  const requests = await prisma.hrRequest.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  const visible = requests.filter((request) => {
    if (status && request.status !== status) return false;
    if (category && request.category !== category) return false;
    if (priority && request.priority !== priority) return false;
    return matchesQuery(q, [request.subject, request.description, request.category, request.adminNote]);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Help"
        title="HR requests"
        description="Raise a workplace, payroll, or policy issue. HR updates the status and you get a notification."
        action={<HrRequestButton />}
      />
      <FilterBar clearHref="/employee/requests">
        <Field label="Search">
          <input className={inputClass} name="q" defaultValue={q} placeholder="Subject or description" />
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
        <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr>
                <th className={th}>Request</th>
                <th className={th}>Priority</th>
                <th className={th}>Status</th>
                <th className={th}>Opened</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((request) => (
                <tr key={request.id}>
                  <td className={td}>
                    <p className="font-medium">{request.subject}</p>
                    <p className="text-mist">{request.category}</p>
                    <p className="mt-1">{request.description}</p>
                    {request.adminNote ? <p className="mt-1 text-mist">HR: {request.adminNote}</p> : null}
                  </td>
                  <td className={td}><StatusBadge value={request.priority} /></td>
                  <td className={td}><StatusBadge value={request.status} /></td>
                  <td className={td}>{formatDateTime(request.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="No matching requests" body="Start a new request if something needs HR." />
      )}
    </div>
  );
}
