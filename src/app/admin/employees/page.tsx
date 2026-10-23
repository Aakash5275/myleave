import Link from "next/link";
import { CreateEmployeeButton, ManagerAssign } from "@/components/admin-forms";
import { StatusBadge } from "@/components/status-badge";
import { Empty, Field, FilterBar, PageHeader, inputClass, td, th } from "@/components/ui";
import { EMPLOYEE_STATUSES, departmentOptions, roleLabel } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { formatDate, fullName, matchesQuery, queryValue } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Employees" };

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser("ADMIN");
  const params = await searchParams;
  const q = queryValue(params.q);
  const department = queryValue(params.department);
  const status = queryValue(params.status);
  const [employees, storedDepartments, managers] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ["EMPLOYEE", "MANAGER", "ACCOUNTANT"] }, ...(department ? { department } : {}), ...(status ? { status } : {}) },
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
        remoteClock: true,
        role: true,
        managerId: true,
        manager: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { firstName: "asc" },
    }),
    prisma.user.findMany({
      where: { role: { in: ["EMPLOYEE", "MANAGER", "ACCOUNTANT"] } },
      distinct: ["department"],
      select: { department: true },
    }),
    prisma.user.findMany({
      where: { role: "MANAGER", status: "Active" },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
  ]);
  const departments = departmentOptions(storedDepartments.map((row) => row.department));
  const managerChoices = managers.map((manager) => ({ id: manager.id, name: fullName(manager) }));
  const visible = employees.filter((employee) =>
    matchesQuery(q, [fullName(employee), employee.email, employee.employeeCode, employee.jobTitle, employee.department, employee.manager ? fullName(employee.manager) : ""]),
  );
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People"
        title="Employees"
        description="Add someone from this list and choose their manager. Use the Manager column to move an existing employee under a manager."
        action={<CreateEmployeeButton managers={managerChoices} />}
      />
      <FilterBar clearHref="/admin/employees">
        <Field label="Search">
          <input className={inputClass} name="q" defaultValue={q} placeholder="Name, email, or ID" />
        </Field>
        <Field label="Department">
          <select className={inputClass} name="department" defaultValue={department}>
            <option value="">All</option>
            {departments.map((item) => <option key={item}>{item}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className={inputClass} name="status" defaultValue={status}>
            <option value="">All</option>
            {EMPLOYEE_STATUSES.map((item) => <option key={item}>{item}</option>)}
          </select>
        </Field>
      </FilterBar>
      {visible.length ? (
        <PeopleTable people={visible} managers={managerChoices} />
      ) : (
        <Empty title="No employees match" body="Adjust the filters or add someone new." />
      )}
    </div>
  );
}

function PeopleTable({
  people,
  managers,
}: {
  people: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    employeeCode: string;
    jobTitle: string;
    department: string;
    hireDate: Date;
    status: string;
    remoteClock: boolean;
    role: string;
    managerId: string | null;
  }[];
  managers: { id: string; name: string }[];
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead>
          <tr>
            <th className={th}>Employee</th>
            <th className={th}>Job</th>
            <th className={th}>Role</th>
            <th className={th}>Manager</th>
            <th className={th}>Department</th>
            <th className={th}>Hired</th>
            <th className={th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {people.map((employee) => (
            <tr key={employee.id}>
              <td className={td}>
                <Link className="font-semibold text-teal" href={`/admin/employees/${employee.id}`}>{fullName(employee)}</Link>
                <p className="text-mist">{employee.employeeCode} · {employee.email}</p>
              </td>
              <td className={td}>{employee.jobTitle}</td>
              <td className={td}>{roleLabel(employee.role)}</td>
              <td className={td}>
                {employee.role === "EMPLOYEE" ? (
                  <ManagerAssign employeeId={employee.id} managerId={employee.managerId ?? ""} managers={managers} />
                ) : (
                  <span className="text-mist">—</span>
                )}
              </td>
              <td className={td}>{employee.department}</td>
              <td className={td}>{formatDate(employee.hireDate)}</td>
              <td className={td}>
                <StatusBadge value={employee.status} />
                {employee.remoteClock ? <p className="mt-1 text-xs text-mist">Anywhere</p> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
