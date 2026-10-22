import Link from "next/link";
import { notFound } from "next/navigation";
import { EmployeeEditor } from "@/components/admin-forms";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { dateKey } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { updateTeamMember } from "@/server/manager-actions";

export const metadata = { title: "Team member" };

export default async function ManagerMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const manager = await requireUser("MANAGER");
  const { id } = await params;
  const employee = await prisma.user.findFirst({
    where: { id, role: "EMPLOYEE", managerId: manager.id },
  });
  if (!employee) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={employee.employeeCode}
        title={`${employee.firstName} ${employee.lastName}`}
        description={`${employee.jobTitle} · ${employee.department}`}
        action={<Link className="text-sm font-semibold text-teal" href="/manager/team">Back to team</Link>}
      />
      <EmployeeEditor
        action={updateTeamMember}
        showAccess={false}
        showSalary={false}
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
    </div>
  );
}
