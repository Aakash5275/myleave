import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { Empty, PageHeader, td, th } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatMoney, formatMonth } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Payslips" };

export default async function PayrollPage() {
  const user = await requireUser("EMPLOYEE");
  const slips = await prisma.payslip.findMany({
    where: { userId: user.id, status: "Issued" },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Pay" title="Payslips" description="Issued payslips only. Drafts stay with HR until they are released." />
      {slips.length ? (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr>
                <th className={th}>Period</th>
                <th className={th}>Net pay</th>
                <th className={th}>Status</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody>
              {slips.map((slip) => (
                <tr key={slip.id}>
                  <td className={td}>{formatMonth(slip.year, slip.month)}</td>
                  <td className={td}>{formatMoney(slip.netPay)}</td>
                  <td className={td}><StatusBadge value={slip.status} /></td>
                  <td className={td}>
                    <Link className="font-semibold text-teal" href={`/employee/payroll/${slip.id}`}>Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="No payslips yet" body="HR will notify you when a payslip is issued." />
      )}
    </div>
  );
}
