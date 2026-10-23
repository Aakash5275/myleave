import Link from "next/link";
import { notFound } from "next/navigation";
import { PayslipForm, PrintButton } from "@/components/admin-forms";
import { PayslipSheet } from "@/components/payslip-sheet";
import { PAYABLE_ROLES } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { fullName } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Edit payslip" };

export default async function AdminPayslipPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("ADMIN");
  const { id } = await params;
  const [slip, employees] = await Promise.all([
    prisma.payslip.findUnique({
      where: { id },
      include: { user: { select: { firstName: true, lastName: true, employeeCode: true, department: true, jobTitle: true } } },
    }),
    prisma.user.findMany({
      where: { role: { in: [...PAYABLE_ROLES] } },
      select: { id: true, firstName: true, lastName: true, employeeCode: true, salary: true },
      orderBy: { firstName: "asc" },
    }),
  ]);
  if (!slip) notFound();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link className="text-sm font-semibold text-teal" href="/admin/payroll">Back to payroll</Link>
        <PrintButton label="Print payslip" />
      </div>
      <div className="grid items-start gap-4 print:hidden xl:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-line bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">Edit payslip</h2>
          <PayslipForm
            employees={employees.map((employee) => ({
              id: employee.id,
              name: `${fullName(employee)} · ${employee.employeeCode}`,
              salary: employee.salary,
            }))}
            payslip={{
              id: slip.id,
              userId: slip.userId,
              month: slip.month,
              year: slip.year,
              basic: slip.basic,
              allowances: slip.allowances,
              tax: slip.tax,
              notes: slip.notes,
            }}
          />
        </div>
        <PayslipSheet employee={slip.user} slip={slip} />
      </div>
      <div className="hidden print:block">
        <PayslipSheet employee={slip.user} slip={slip} />
      </div>
    </div>
  );
}
