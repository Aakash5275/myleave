import { PrintButton } from "@/components/admin-forms";
import { Field, FilterBar, PageHeader, Panel, Stat, inputClass, td, th } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { PAYABLE_ROLES, departmentOptions } from "@/lib/constants";
import { formatMoney, formatMonth, fullName, monthKeys, queryValue, todayKey } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Pay report" };

export default async function AccountantReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser("ACCOUNTANT");
  const params = await searchParams;
  const monthValue = queryValue(params.month) || todayKey().slice(0, 7);
  const department = queryValue(params.department);
  const range = monthKeys(monthValue) ?? monthKeys(todayKey().slice(0, 7))!;
  const [slips, storedDepartments] = await Promise.all([
    prisma.payslip.findMany({
      where: {
        year: range.year,
        month: range.month,
        ...(department ? { user: { department } } : {}),
      },
      select: {
        id: true,
        status: true,
        netPay: true,
        basic: true,
        allowances: true,
        overtime: true,
        deductions: true,
        tax: true,
        user: { select: { firstName: true, lastName: true, employeeCode: true, department: true } },
      },
      orderBy: { user: { firstName: "asc" } },
    }),
    prisma.user.findMany({
      where: { role: { in: [...PAYABLE_ROLES] } },
      distinct: ["department"],
      select: { department: true },
    }),
  ]);
  const departments = departmentOptions(storedDepartments.map((row) => row.department));
  const issued = slips.filter((slip) => slip.status === "Issued");
  const drafts = slips.filter((slip) => slip.status === "Draft");
  const total = (rows: typeof slips, key: "netPay" | "basic" | "allowances" | "overtime" | "deductions" | "tax") =>
    rows.reduce((sum, slip) => sum + slip[key], 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pay"
        title="Pay report"
        description={`${formatMonth(range.year, range.month)}${department ? ` · ${department}` : ""}.`}
        action={<PrintButton label="Print report" />}
      />
      <FilterBar clearHref="/accountant/reports">
        <Field label="Month">
          <input className={inputClass} type="month" name="month" defaultValue={`${range.year}-${String(range.month).padStart(2, "0")}`} />
        </Field>
        <Field label="Department">
          <select className={inputClass} name="department" defaultValue={department}>
            <option value="">All departments</option>
            {departments.map((item) => <option key={item}>{item}</option>)}
          </select>
        </Field>
      </FilterBar>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Issued net" value={formatMoney(total(issued, "netPay"))} hint={`${issued.length} issued`} />
        <Stat label="Draft net" value={formatMoney(total(drafts, "netPay"))} hint={`${drafts.length} draft`} tone="amber" />
        <Stat label="Issued tax" value={formatMoney(total(issued, "tax"))} />
        <Stat label="Issued deductions" value={formatMoney(total(issued, "deductions"))} tone="ink" />
      </div>
      <Panel title="Payslips">
        {slips.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr>
                  <th className={th}>Employee</th>
                  <th className={th}>Department</th>
                  <th className={th}>Basic</th>
                  <th className={th}>Allowances</th>
                  <th className={th}>Overtime</th>
                  <th className={th}>Deductions</th>
                  <th className={th}>Tax</th>
                  <th className={th}>Net</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {slips.map((slip) => (
                  <tr key={slip.id}>
                    <td className={td}>{fullName(slip.user)}<p className="text-mist">{slip.user.employeeCode}</p></td>
                    <td className={td}>{slip.user.department}</td>
                    <td className={td}>{formatMoney(slip.basic)}</td>
                    <td className={td}>{formatMoney(slip.allowances)}</td>
                    <td className={td}>{formatMoney(slip.overtime)}</td>
                    <td className={td}>{formatMoney(slip.deductions)}</td>
                    <td className={td}>{formatMoney(slip.tax)}</td>
                    <td className={td}>{formatMoney(slip.netPay)}</td>
                    <td className={td}>{slip.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-mist">No payslips for this month.</p>
        )}
      </Panel>
    </div>
  );
}
