import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/admin-forms";
import { PayslipSheet } from "@/components/payslip-sheet";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Payslip" };

export default async function PayslipPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("EMPLOYEE");
  const { id } = await params;
  const slip = await prisma.payslip.findFirst({
    where: { id, userId: user.id, status: "Issued" },
  });
  if (!slip) notFound();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link className="text-sm font-semibold text-teal" href="/employee/payroll">Back to payslips</Link>
        <PrintButton label="Print payslip" />
      </div>
      <PayslipSheet employee={user} slip={slip} />
    </div>
  );
}
