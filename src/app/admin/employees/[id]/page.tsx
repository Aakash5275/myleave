import Link from "next/link";
import { notFound } from "next/navigation";
import { EmployeeEditor } from "@/components/admin-forms";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader, Panel, td, th } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { dateKey, formatDate, formatMoney, formatMonth } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Employee" };

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("ADMIN");
  const { id } = await params;
  const employee = await prisma.user.findFirst({
    where: { id, role: "EMPLOYEE" },
    include: {
      attendances: { orderBy: { date: "desc" }, take: 8 },
      leaveRequests: { orderBy: { createdAt: "desc" }, take: 6 },
      payslips: { orderBy: [{ year: "desc" }, { month: "desc" }], take: 6 },
      hrRequests: { orderBy: { createdAt: "desc" }, take: 6 },
      documentRequests: { orderBy: { createdAt: "desc" }, take: 6 },
    },
  });
  if (!employee) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={employee.employeeCode}
        title={`${employee.firstName} ${employee.lastName}`}
        description={`${employee.jobTitle} · ${employee.department}`}
        action={<Link className="text-sm font-semibold text-teal" href="/admin/employees">All employees</Link>}
      />
      <EmployeeEditor
        employee={{
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          phone: employee.phone,
          department: employee.department,
          jobTitle: employee.jobTitle,
          hireDate: dateKey(employee.hireDate),
          address: employee.address,
          emergencyName: employee.emergencyName,
          emergencyPhone: employee.emergencyPhone,
          status: employee.status,
          remoteClock: employee.remoteClock,
          salary: employee.salary,
        }}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Recent attendance">
          <MiniTable
            headers={["Date", "Status"]}
            rows={employee.attendances.map((row) => [formatDate(row.date), row.status])}
          />
        </Panel>
        <Panel title="Leave">
          <MiniTable
            headers={["Type", "Status"]}
            rows={employee.leaveRequests.map((row) => [`${row.type} · ${row.days}d`, row.status])}
          />
        </Panel>
        <Panel title="Payslips">
          <MiniTable
            headers={["Period", "Net"]}
            rows={employee.payslips.map((row) => [formatMonth(row.year, row.month), formatMoney(row.netPay)])}
          />
        </Panel>
        <Panel title="Requests">
          <ul className="space-y-3 text-sm">
            {employee.hrRequests.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3">
                <span>{row.subject}</span>
                <StatusBadge value={row.status} />
              </li>
            ))}
            {employee.documentRequests.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3">
                <span>{row.docType}</span>
                <StatusBadge value={row.status} />
              </li>
            ))}
            {!employee.hrRequests.length && !employee.documentRequests.length ? <li className="text-mist">No requests yet.</li> : null}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function MiniTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  if (!rows.length) return <p className="text-sm text-mist">Nothing recorded yet.</p>;
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr>{headers.map((header) => <th key={header} className={th}>{header}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index}>
            {row.map((cell) => <td key={cell} className={td}>{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
