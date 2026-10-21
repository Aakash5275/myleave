import Link from "next/link";
import { ReviewForm } from "@/components/review-form";
import { StatusBadge } from "@/components/status-badge";
import { Empty, Field, FilterBar, PageHeader, inputClass } from "@/components/ui";
import { DOC_TYPES, REQUEST_STATUSES } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { formatDateTime, fullName, matchesQuery, queryValue } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { reviewDocument } from "@/server/admin-actions";

export const metadata = { title: "Documents" };

export default async function AdminDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser("ADMIN");
  const params = await searchParams;
  const q = queryValue(params.q);
  const status = queryValue(params.status);
  const docType = queryValue(params.docType);
  const requests = await prisma.documentRequest.findMany({
    where: { ...(status ? { status } : {}), ...(docType ? { docType } : {}) },
    select: {
      id: true,
      userId: true,
      docType: true,
      purpose: true,
      details: true,
      status: true,
      adminNote: true,
      createdAt: true,
      user: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const visible = requests.filter((request) =>
    matchesQuery(q, [fullName(request.user), request.docType, request.purpose, request.details]),
  );

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Records" title="Document requests" description="Approve a request, mark it resolved once the letter is issued, or reject it with a note." />
      <FilterBar clearHref="/admin/documents">
        <Field label="Search">
          <input className={inputClass} name="q" defaultValue={q} placeholder="Employee or purpose" />
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
        <div className="space-y-3">
          {visible.map((request) => (
            <article key={request.id} className="grid gap-4 rounded-2xl border border-line bg-white p-4 shadow-sm lg:grid-cols-[1.4fr_0.8fr]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{request.docType}</p>
                  <StatusBadge value={request.status} />
                </div>
                <p className="mt-1 text-sm text-mist">
                  <Link className="font-medium text-teal" href={`/admin/employees/${request.userId}`}>{fullName(request.user)}</Link>
                  {" · "}{formatDateTime(request.createdAt)}
                </p>
                <p className="mt-2 text-sm">{request.purpose}</p>
                {request.details ? <p className="mt-1 text-sm text-mist">{request.details}</p> : null}
              </div>
              <ReviewForm action={reviewDocument} id={request.id} status={request.status} note={request.adminNote} />
            </article>
          ))}
        </div>
      ) : (
        <Empty title="No document requests" body="Requests for letters and certificates will appear here." />
      )}
    </div>
  );
}
