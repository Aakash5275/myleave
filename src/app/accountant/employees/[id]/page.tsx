import Link from "next/link";
import { notFound } from "next/navigation";
import { PayImport, SalaryEditor } from "@/components/accountant-forms";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader, Panel, td, th } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { PAYABLE_ROLES } from "@/lib/constants";
import { formatMoney, formatMonth, fullName } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Employee pay" };

export default async function AccountantEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("ACCOUNTANT");
  const { id } = await params;
  const [person, people] = await Promise.all([
    prisma.user.findFirst({
      where: { id, role: { in: [...PAYABLE_ROLES] } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeCode: true,
        jobTitle: true,
        department: true,
        status: true,
        salary: true,
        payslips: {
          orderBy: [{ year: "desc" }, { month: "desc" }],
          select: { id: true, year: true, month: true, netPay: true, status: true },
        },
        payrollDocuments: {
          orderBy: { createdAt: "desc" },
          take: 8,
          select: { id: true, fileName: true, createdAt: true },
        },
      },
    }),
    prisma.user.findMany({
      where: { role: { in: [...PAYABLE_ROLES] }, status: "Active" },
      select: { id: true, firstName: true, lastName: true, employeeCode: true, salary: true },
      orderBy: { firstName: "asc" },
    }),
  ]);
  if (!person) notFound();
  const options = people.map((employee) => ({
    id: employee.id,
    name: `${fullName(employee)} · ${employee.employeeCode}`,
    salary: employee.salary,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={person.employeeCode}
        title={fullName(person)}
        description={`${person.jobTitle} · ${person.department} · ${person.status}`}
        action={<Link className="text-sm font-semibold text-teal" href="/accountant/employees">All employees</Link>}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Salary" description="This is the monthly amount used as the starting basic pay.">
          <SalaryEditor id={person.id} salary={person.salary} label="Save salary" />
        </Panel>
        <Panel title="Upload a pay document" description="A PDF or Word file can fill the payslip. Change every amount before you save or issue it.">
          <PayImport employees={options} userId={person.id} />
        </Panel>
      </div>
      <Panel title="Payslips" description="Open any slip to edit basic, allowances, tax, notes, and the period.">
        {person.payslips.length ? (
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className={th}>Period</th>
                <th className={th}>Net</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {person.payslips.map((slip) => (
                <tr key={slip.id}>
                  <td className={td}>
                    <Link className="font-semibold text-teal" href={`/accountant/payroll/${slip.id}`}>{formatMonth(slip.year, slip.month)}</Link>
                  </td>
                  <td className={td}>{formatMoney(slip.netPay)}</td>
                  <td className={td}><StatusBadge value={slip.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-mist">No payslips yet.</p>
        )}
      </Panel>
      {person.payrollDocuments.length ? (
        <Panel title="Uploaded documents">
          <ul className="space-y-2 text-sm">
            {person.payrollDocuments.map((document) => (
              <li key={document.id}>
                <a className="font-semibold text-teal" href={`/accountant/documents/${document.id}`}>{document.fileName}</a>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}
