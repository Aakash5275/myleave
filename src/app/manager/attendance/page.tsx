import { ApproveAttendanceButton } from "@/components/manager-forms";
import { PunchLocation } from "@/components/gps-link";
import { StatusBadge } from "@/components/status-badge";
import { Field, FilterBar, PageHeader, inputClass, td, th } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { fullName, parseKey, queryValue, todayKey } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Team attendance" };

export default async function ManagerAttendancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const manager = await requireUser("MANAGER");
  const params = await searchParams;
  const date = queryValue(params.date) || todayKey();
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayKey();
  const team = await prisma.user.findMany({
    where: { role: "EMPLOYEE", managerId: manager.id, status: "Active" },
    orderBy: { firstName: "asc" },
    select: { id: true, firstName: true, lastName: true, employeeCode: true, department: true },
  });
  const records = await prisma.attendance.findMany({
    where: { userId: { in: team.map((person) => person.id) }, date: parseKey(safeDate) },
  });
  const byUser = new Map(records.map((record) => [record.userId, record]));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Time"
        title="Attendance"
        description="Approve attendance only for employees who report to you."
      />
      <FilterBar clearHref="/manager/attendance">
        <Field label="Date">
          <input className={inputClass} type="date" name="date" defaultValue={safeDate} />
        </Field>
      </FilterBar>
      {team.length ? (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr>
                <th className={th}>Employee</th>
                <th className={th}>In</th>
                <th className={th}>Out</th>
                <th className={th}>Status</th>
                <th className={th}>Approval</th>
              </tr>
            </thead>
            <tbody>
              {team.map((employee) => {
                const record = byUser.get(employee.id);
                return (
                  <tr key={employee.id}>
                    <td className={td}>
                      <p className="font-medium">{fullName(employee)}</p>
                      <p className="text-mist">{employee.employeeCode} · {employee.department}</p>
                    </td>
                    <td className={td}>
                      <PunchLocation time={record?.checkIn ?? null} latitude={record?.checkInLat ?? null} longitude={record?.checkInLng ?? null} accuracy={record?.checkInAccuracy ?? null} />
                    </td>
                    <td className={td}>
                      <PunchLocation time={record?.checkOut ?? null} latitude={record?.checkOutLat ?? null} longitude={record?.checkOutLng ?? null} accuracy={record?.checkOutAccuracy ?? null} />
                    </td>
                    <td className={td}><StatusBadge value={record?.status ?? "Not marked"} /></td>
                    <td className={td}>
                      {record?.approvedAt ? (
                        <StatusBadge value="Approved" />
                      ) : record ? (
                        <ApproveAttendanceButton userId={employee.id} day={safeDate} />
                      ) : (
                        <span className="text-mist">No record yet</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-mist">Add employees to your team before you can approve attendance.</p>
      )}
    </div>
  );
}
