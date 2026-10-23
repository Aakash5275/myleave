import Link from "next/link";
import { PageHeader, Panel, Stat, td, th } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { PAYABLE_ROLES } from "@/lib/constants";
import { formatMoney, formatMonth, fullName, monthKeys, todayKey } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Payroll" };

export default async function AccountantHomePage() {
  await requireUser("ACCOUNTANT");
  const key = todayKey().slice(0, 7);
  const range = monthKeys(key)!;
  const [people, slips] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: [...PAYABLE_ROLES] }, status: "Active" },
      select: { id: true, firstName: true, lastName: true, employeeCode: true, department: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.payslip.findMany({
      where: { year: range.year, month: range.month },
      select: {
        id: true,
        userId: true,
        status: true,
        netPay: true,
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const issued = slips.filter((slip) => slip.status === "Issued");
  const drafts = slips.filter((slip) => slip.status === "Draft");
  const covered = new Set(slips.map((slip) => slip.userId));
  const missing = people.filter((person) => !covered.has(person.id));
  const issuedTotal = issued.reduce((sum, slip) => sum + slip.netPay, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pay"
        title="Payroll"
        description={`This month is ${formatMonth(range.year, range.month)}. Issue payslips, or open someone who does not have one yet.`}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Issued this month" value={formatMoney(issuedTotal)} hint={`${issued.length} payslip(s)`} />
        <Stat label="Drafts waiting" value={drafts.length} tone="amber" />
        <Stat label="No payslip yet" value={missing.length} hint="Active people for this month" tone="ink" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Still to pay" description="Active people with no payslip for this month.">
          {missing.length ? (
            <ul className="space-y-2 text-sm">
              {missing.map((person) => (
                <li key={person.id} className="flex items-center justify-between gap-3">
                  <span>{fullName(person)} <span className="text-mist">· {person.employeeCode}</span></span>
                  <Link className="font-semibold text-teal" href={`/accountant/employees/${person.id}`}>Open</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-mist">Everyone active has a payslip for this month.</p>
          )}
        </Panel>
        <Panel title="Drafts" description="Open a draft to edit every amount, then issue it.">
          {drafts.length ? (
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className={th}>Employee</th>
                  <th className={th}>Net</th>
                </tr>
              </thead>
              <tbody>
                {drafts.map((slip) => (
                  <tr key={slip.id}>
                    <td className={td}>
                      <Link className="font-semibold text-teal" href={`/accountant/payroll/${slip.id}`}>{fullName(slip.user)}</Link>
                    </td>
                    <td className={td}>{formatMoney(slip.netPay)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-mist">No drafts for this month.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
