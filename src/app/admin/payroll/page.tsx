import Link from "next/link";
import { PayslipForm } from "@/components/admin-forms";
import { PayslipSheet } from "@/components/payslip-sheet";
import { StatusBadge } from "@/components/status-badge";
import { Empty, Field, FilterBar, PageHeader, Panel, inputClass, td, th } from "@/components/ui";
import { SAMPLE_PAYSLIP } from "@/lib/payslip-pdf";
import { PAYABLE_ROLES } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { formatMoney, formatMonth, fullName, matchesQuery, monthKeys, queryValue } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Payroll" };

export default async function AdminPayrollPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser("ADMIN");
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
  const visible = slips.filter((slip) => {
    if (status && slip.status !== status) return false;
    if (range && (slip.year !== range.year || slip.month !== range.month)) return false;
    return matchesQuery(q, [fullName(slip.user), slip.user.employeeCode, formatMonth(slip.year, slip.month), slip.status]);
  });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Pay" title="Payroll" description="Issue a payslip to notify the employee, or save a draft until the numbers are final. The sample below is the standard PDF every person downloads." />
      <Panel
        title="Standard payslip"
        description="This sample is the layout employees get when they pick a month. The PDF is generated on download and is not stored."
        action={<a className="text-sm font-semibold text-teal" href="/admin/payroll/file">Download sample PDF</a>}
      >
        <PayslipSheet employee={SAMPLE_PAYSLIP.employee} slip={SAMPLE_PAYSLIP.slip} />
      </Panel>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
        <Panel className="min-w-0" title="New payslip">
          {employees.length ? (
            <PayslipForm
              employees={employees.map((employee) => ({
                id: employee.id,
                name: `${fullName(employee)} · ${employee.employeeCode}`,
                salary: employee.salary,
              }))}
            />
          ) : (
            <p className="text-sm text-mist">Add an active employee before creating a payslip.</p>
          )}
        </Panel>
        <div className="min-w-0">
          <FilterBar clearHref="/admin/payroll">
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
                        <Link className="font-semibold text-teal" href={`/admin/payroll/${slip.id}`}>{formatMonth(slip.year, slip.month)}</Link>
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
