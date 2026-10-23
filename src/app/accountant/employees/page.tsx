import Link from "next/link";
import { SalaryEditor } from "@/components/accountant-forms";
import { Empty, Field, FilterBar, PageHeader, inputClass, td, th } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { PAYABLE_ROLES, departmentOptions, roleLabel } from "@/lib/constants";
import { fullName, matchesQuery, queryValue } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Employees" };

export default async function AccountantEmployeesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser("ACCOUNTANT");
  const params = await searchParams;
  const q = queryValue(params.q);
  const department = queryValue(params.department);
  const [people, storedDepartments] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: [...PAYABLE_ROLES] }, ...(department ? { department } : {}) },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeCode: true,
        jobTitle: true,
        department: true,
        status: true,
        salary: true,
        role: true,
        manager: { select: { firstName: true, lastName: true } },
      },
      orderBy: { firstName: "asc" },
    }),
    prisma.user.findMany({
      where: { role: { in: [...PAYABLE_ROLES] } },
      distinct: ["department"],
      select: { department: true },
    }),
  ]);
  const departments = departmentOptions(storedDepartments.map((row) => row.department));
  const visible = people.filter((person) =>
    matchesQuery(q, [fullName(person), person.employeeCode, person.jobTitle, person.department, person.manager ? fullName(person.manager) : ""]),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People"
        title="Employees"
        description="Everyone who can be paid. Change a salary here, or open a person to upload a pay document and edit their payslips."
      />
      <FilterBar clearHref="/accountant/employees">
        <Field label="Search">
          <input className={inputClass} name="q" defaultValue={q} placeholder="Name, ID, or job" />
        </Field>
        <Field label="Department">
          <select className={inputClass} name="department" defaultValue={department}>
            <option value="">All</option>
            {departments.map((item) => <option key={item}>{item}</option>)}
          </select>
        </Field>
      </FilterBar>
      {visible.length ? (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr>
                <th className={th}>Employee</th>
                <th className={th}>Job</th>
                <th className={th}>Role</th>
                <th className={th}>Manager</th>
                <th className={th}>Department</th>
                <th className={th}>Salary</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((person) => (
                <tr key={person.id}>
                  <td className={td}>
                    <Link className="font-semibold text-teal" href={`/accountant/employees/${person.id}`}>{fullName(person)}</Link>
                    <p className="text-mist">{person.employeeCode}</p>
                  </td>
                  <td className={td}>{person.jobTitle}</td>
                  <td className={td}>{roleLabel(person.role)}</td>
                  <td className={td}>{person.manager ? fullName(person.manager) : "—"}</td>
                  <td className={td}>{person.department}</td>
                  <td className={td}>
                    <SalaryEditor id={person.id} salary={person.salary} />
                  </td>
                  <td className={td}>{person.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="No employees match" body="Adjust the search or department filter." />
      )}
    </div>
  );
}
