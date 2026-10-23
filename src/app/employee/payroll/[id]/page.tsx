import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/admin-forms";
import { PayslipSheet } from "@/components/payslip-sheet";
import { requireSelf } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Payslip" };

export default async function PayslipPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSelf();
  const { id } = await params;
  const slip = await prisma.payslip.findFirst({
    where: { id, userId: user.id, status: "Issued" },
  });
  if (!slip) notFound();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link className="text-sm font-semibold text-teal" href="/employee/payroll">Back to payslips</Link>
        <div className="flex flex-wrap gap-2">
          <a className="inline-flex items-center justify-center rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink" href={`/employee/payroll/file?month=${slip.year}-${String(slip.month).padStart(2, "0")}`}>Download PDF</a>
          <PrintButton label="Print payslip" />
        </div>
      </div>
      <PayslipSheet employee={user} slip={slip} />
    </div>
  );
}
