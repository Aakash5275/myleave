import Link from "next/link";
import { PayImport } from "@/components/accountant-forms";
import { PayslipForm } from "@/components/admin-forms";
import { StatusBadge } from "@/components/status-badge";
import { Empty, Field, FilterBar, PageHeader, Panel, inputClass, td, th } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { PAYABLE_ROLES } from "@/lib/constants";
import { formatMoney, formatMonth, fullName, matchesQuery, monthKeys, queryValue } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Payslips" };

export default async function AccountantPayrollPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser("ACCOUNTANT");
  const params = await searchParams;
  const q = queryValue(params.q);
  const month = queryValue(params.month);
  const status = queryValue(params.status);
  const range = month ? monthKeys(month) : null;
  const [employees, slips] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: [...PAYABLE_ROLES] }, status: "Active" },
      select: { id: true, firstName: true, lastName: true, employeeCode: true, salary: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.payslip.findMany({
      select: {
        id: true,
        year: true,
        month: true,
        netPay: true,
        status: true,
        user: { select: { firstName: true, lastName: true, employeeCode: true } },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }),
  ]);
  const options = employees.map((employee) => ({
    id: employee.id,
    name: `${fullName(employee)} · ${employee.employeeCode}`,
    salary: employee.salary,
  }));
  const visible = slips.filter((slip) => {
    if (status && slip.status !== status) return false;
    if (range && (slip.year !== range.year || slip.month !== range.month)) return false;
    return matchesQuery(q, [fullName(slip.user), slip.user.employeeCode, formatMonth(slip.year, slip.month), slip.status]);
  });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Pay" title="Payslips" description="Create a payslip by hand, or upload a PDF or Word file and edit every extracted amount." />
      <Panel title="Upload a document" description="The file is saved on the employee. Amounts found in the text are filled in, and you can change all of them.">
        {options.length ? <PayImport employees={options} /> : <p className="text-sm text-mist">Add an active employee before importing a document.</p>}
      </Panel>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
        <Panel className="min-w-0" title="New payslip" description="Every field can be edited. Save a draft or issue it.">
          {options.length ? <PayslipForm employees={options} /> : <p className="text-sm text-mist">Add an active employee before creating a payslip.</p>}
        </Panel>
        <div className="min-w-0">
          <FilterBar clearHref="/accountant/payroll">
            <Field label="Search">
              <input className={inputClass} name="q" defaultValue={q} placeholder="Employee or period" />
            </Field>
            <Field label="Month">
              <input className={inputClass} type="month" name="month" defaultValue={month} />
            </Field>
            <Field label="Status">
              <select className={inputClass} name="status" defaultValue={status}>
                <option value="">All</option>
                <option>Draft</option>
                <option>Issued</option>
              </select>
            </Field>
          </FilterBar>
          {visible.length ? (
            <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr>
                    <th className={th}>Employee</th>
                    <th className={th}>Period</th>
                    <th className={th}>Net</th>
                    <th className={th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((slip) => (
                    <tr key={slip.id}>
                      <td className={td}>{fullName(slip.user)}</td>
                      <td className={td}>
                        <Link className="font-semibold text-teal" href={`/accountant/payroll/${slip.id}`}>{formatMonth(slip.year, slip.month)}</Link>
                      </td>
                      <td className={td}>{formatMoney(slip.netPay)}</td>
                      <td className={td}><StatusBadge value={slip.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="No payslips in this view" body="Create one, or clear the month filter." />
          )}
        </div>
      </div>
    </div>
  );
}
