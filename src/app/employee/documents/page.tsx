import { DocumentRequestButton } from "@/components/employee-forms";
import { StatusBadge } from "@/components/status-badge";
import { Empty, Field, FilterBar, PageHeader, inputClass, td, th } from "@/components/ui";
import { DOC_TYPES, REQUEST_STATUSES } from "@/lib/constants";
import { requireSelf } from "@/lib/auth";
import { formatDateTime, matchesQuery, queryValue } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Documents" };

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireSelf();
  const params = await searchParams;
  const q = queryValue(params.q);
  const status = queryValue(params.status);
  const docType = queryValue(params.docType);
  const requests = await prisma.documentRequest.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  const visible = requests.filter((request) => {
    if (status && request.status !== status) return false;
    if (docType && request.docType !== docType) return false;
    return matchesQuery(q, [request.docType, request.purpose, request.details, request.adminNote]);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Records"
        title="Document requests"
        description="Ask HR for letters and certificates. Approved means it is accepted. Resolved means it has been issued."
        action={<DocumentRequestButton />}
      />
      <FilterBar clearHref="/employee/documents">
        <Field label="Search">
          <input className={inputClass} name="q" defaultValue={q} placeholder="Purpose or note" />
        </Field>
        <Field label="Document">
          <select className={inputClass} name="docType" defaultValue={docType}>
            <option value="">All</option>
            {DOC_TYPES.map((item) => <option key={item}>{item}</option>)}
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
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr>
                <th className={th}>Document</th>
                <th className={th}>Purpose</th>
                <th className={th}>Status</th>
                <th className={th}>Opened</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((request) => (
                <tr key={request.id}>
                  <td className={td}>{request.docType}</td>
                  <td className={td}>
                    <p>{request.purpose}</p>
                    {request.details ? <p className="mt-1 text-mist">{request.details}</p> : null}
                    {request.adminNote ? <p className="mt-1 text-mist">HR: {request.adminNote}</p> : null}
                  </td>
                  <td className={td}><StatusBadge value={request.status} /></td>
                  <td className={td}>{formatDateTime(request.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="No document requests" body="Request a letter or certificate when you need one." />
      )}
    </div>
  );
}
