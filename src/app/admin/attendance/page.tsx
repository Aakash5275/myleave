import { AttendanceEditor, MarkAbsentButton } from "@/components/admin-forms";
import { StatusBadge } from "@/components/status-badge";
import { Field, FilterBar, PageHeader, inputClass, td, th } from "@/components/ui";
import { ATTENDANCE_STATUSES, DEPARTMENTS } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { dateKey, fullName, isWeekday, matchesQuery, queryValue, todayKey } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Attendance management" };

export default async function AdminAttendancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser("ADMIN");
  const params = await searchParams;
  const date = queryValue(params.date) || todayKey();
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayKey();
  const department = queryValue(params.department);
  const status = queryValue(params.status);
  const q = queryValue(params.q);
  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE", ...(department ? { department } : {}) },
    orderBy: { firstName: "asc" },
  });
  const records = await prisma.attendance.findMany({ where: { date: new Date(`${safeDate}T00:00:00.000Z`) } });
  const byUser = new Map(records.map((record) => [record.userId, record]));
  const rows = employees
    .map((employee) => ({ employee, record: byUser.get(employee.id) ?? null }))
    .filter(({ employee, record }) => {
      const label = record?.status ?? "Not marked";
      if (status && label !== status) return false;
      return matchesQuery(q, [fullName(employee), employee.employeeCode, employee.department, label]);
    });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Time"
        title="Attendance"
        description="Review a day, correct a record, or mark everyone still blank as absent."
        action={isWeekday(safeDate) ? <MarkAbsentButton date={safeDate} /> : null}
      />
      <FilterBar clearHref="/admin/attendance">
        <Field label="Date">
          <input className={inputClass} type="date" name="date" defaultValue={safeDate} />
        </Field>
        <Field label="Search">
          <input className={inputClass} name="q" defaultValue={q} placeholder="Name or ID" />
        </Field>
        <Field label="Department">
          <select className={inputClass} name="department" defaultValue={department}>
            <option value="">All</option>
            {DEPARTMENTS.map((item) => <option key={item}>{item}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className={inputClass} name="status" defaultValue={status}>
            <option value="">All</option>
            <option>Not marked</option>
            {ATTENDANCE_STATUSES.map((item) => <option key={item}>{item}</option>)}
          </select>
        </Field>
      </FilterBar>
      <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr>
              <th className={th}>Employee</th>
              <th className={th}>In</th>
              <th className={th}>Out</th>
              <th className={th}>Status</th>
              <th className={th}>Record</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ employee, record }) => (
              <tr key={employee.id}>
                <td className={td}>
                  <p className="font-medium">{fullName(employee)}</p>
                  <p className="text-mist">{employee.employeeCode} · {employee.department}</p>
                </td>
                <td className={td}>{record?.checkIn ?? "—"}</td>
                <td className={td}>{record?.checkOut ?? "—"}</td>
                <td className={td}><StatusBadge value={record?.status ?? "Not marked"} /></td>
                <td className={td}>
                  <AttendanceEditor
                    userId={employee.id}
                    date={dateKey(new Date(`${safeDate}T00:00:00.000Z`))}
                    status={record?.status ?? "Present"}
                    checkIn={record?.checkIn ?? ""}
                    checkOut={record?.checkOut ?? ""}
                    notes={record?.notes ?? ""}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
