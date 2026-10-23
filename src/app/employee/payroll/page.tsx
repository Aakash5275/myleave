import Link from "next/link";
import { PayrollDownload } from "@/components/payroll-download";
import { StatusBadge } from "@/components/status-badge";
import { Empty, PageHeader, Panel, td, th } from "@/components/ui";
import { requireSelf } from "@/lib/auth";
import { formatMoney, formatMonth, todayKey } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Payslips" };

export default async function PayrollPage() {
  const user = await requireSelf();
  const slips = await prisma.payslip.findMany({
    where: { userId: user.id, status: "Issued" },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Pay" title="Payslips" description="Choose a month and download a PDF. It is created at that moment and is not saved on the server. The same month always uses this standard layout." />
      <Panel title="Download a month" description="An issued payslip is used when one exists. Otherwise the PDF uses your monthly salary.">
        <PayrollDownload defaultMonth={todayKey().slice(0, 7)} />
      </Panel>
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
