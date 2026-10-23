import Link from "next/link";
import { notFound } from "next/navigation";
import { CreateEmployeeButton, EmployeeEditor } from "@/components/admin-forms";
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
    where: { id, role: { in: ["EMPLOYEE", "MANAGER", "ACCOUNTANT"] } },
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      jobTitle: true,
      department: true,
      email: true,
      phone: true,
      hireDate: true,
      address: true,
      emergencyName: true,
      emergencyPhone: true,
      status: true,
      remoteClock: true,
      salary: true,
      role: true,
      managerId: true,
      attendances: { orderBy: { date: "desc" }, take: 8, select: { id: true, date: true, status: true } },
      leaveRequests: { orderBy: { createdAt: "desc" }, take: 6, select: { id: true, type: true, days: true, status: true } },
      payslips: { orderBy: [{ year: "desc" }, { month: "desc" }], take: 6, select: { id: true, year: true, month: true, netPay: true } },
      hrRequests: { orderBy: { createdAt: "desc" }, take: 6, select: { id: true, subject: true, status: true } },
      documentRequests: { orderBy: { createdAt: "desc" }, take: 6, select: { id: true, docType: true, status: true } },
    },
  });
  if (!employee) notFound();
  const [managers, team] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: "MANAGER",
        id: { not: employee.id },
        OR: [{ status: "Active" }, ...(employee.managerId ? [{ id: employee.managerId }] : [])],
      },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
    employee.role === "MANAGER"
      ? prisma.user.findMany({
          where: { role: "EMPLOYEE", managerId: employee.id },
          select: { id: true, firstName: true, lastName: true, employeeCode: true, jobTitle: true, department: true, status: true },
          orderBy: { firstName: "asc" },
        })
      : Promise.resolve([]),
  ]);
  const managerName = `${employee.firstName} ${employee.lastName}`;

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
          role: employee.role,
          managerId: employee.managerId ?? "",
        }}
        managers={managers.map((manager) => ({ id: manager.id, name: `${manager.firstName} ${manager.lastName}` }))}
      />
      {employee.role === "MANAGER" ? (
        <Panel
          title="Team"
          description="Employees who report to this manager. You can edit any of them, including their role and manager."
          action={<CreateEmployeeButton fixedManager={{ id: employee.id, name: managerName }} label="Add employee" />}
        >
          {team.length ? (
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className={th}>Employee</th>
                  <th className={th}>Job</th>
                  <th className={th}>Department</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {team.map((person) => (
                  <tr key={person.id}>
                    <td className={td}>
                      <Link className="font-semibold text-teal" href={`/admin/employees/${person.id}`}>{person.firstName} {person.lastName}</Link>
                      <p className="text-mist">{person.employeeCode}</p>
                    </td>
                    <td className={td}>{person.jobTitle}</td>
                    <td className={td}>{person.department}</td>
                    <td className={td}><StatusBadge value={person.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-mist">No employees under this manager yet.</p>
          )}
        </Panel>
      ) : null}
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
