import Link from "next/link";
import { CreateEmployeeButton } from "@/components/admin-forms";
import { StatusBadge } from "@/components/status-badge";
import { Empty, PageHeader, td, th } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDate, fullName } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { createTeamMember } from "@/server/manager-actions";

export const metadata = { title: "Team" };

export default async function ManagerTeamPage() {
  const manager = await requireUser("MANAGER");
  const team = await prisma.user.findMany({
    where: { role: "EMPLOYEE", managerId: manager.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      employeeCode: true,
      jobTitle: true,
      department: true,
      hireDate: true,
      status: true,
    },
    orderBy: { firstName: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People"
        title="Your team"
        description="Employees you add here report to you. You can update their records and approve their attendance."
        action={<CreateEmployeeButton action={createTeamMember} showAccess={false} />}
      />
      {team.length ? (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr>
                <th className={th}>Employee</th>
                <th className={th}>Job</th>
                <th className={th}>Department</th>
                <th className={th}>Hired</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {team.map((employee) => (
                <tr key={employee.id}>
                  <td className={td}>
                    <Link className="font-semibold text-teal" href={`/manager/team/${employee.id}`}>{fullName(employee)}</Link>
                    <p className="text-mist">{employee.employeeCode} · {employee.email}</p>
                  </td>
                  <td className={td}>{employee.jobTitle}</td>
                  <td className={td}>{employee.department}</td>
                  <td className={td}>{formatDate(employee.hireDate)}</td>
                  <td className={td}><StatusBadge value={employee.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="No one on your team yet" body="Add an employee and they will report to you." />
      )}
    </div>
  );
}
