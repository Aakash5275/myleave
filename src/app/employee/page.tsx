import Link from "next/link";
import { AttendanceClock } from "@/components/employee-forms";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader, Panel, Stat, Workflow } from "@/components/ui";
import { getSessionClaims, requireSelf } from "@/lib/auth";
import { formatDate, formatMoney, formatMonth, fullName, monthKeys, todayKey } from "@/lib/format";
import { loadEmployeeHome } from "@/server/home";

export const metadata = { title: "Dashboard" };

export default async function EmployeeDashboard() {
  const claims = await getSessionClaims();
  const today = todayKey();
  const month = monthKeys(today.slice(0, 7))!;
  const year = Number(today.slice(0, 4));
  const [user, home] = await Promise.all([
    requireSelf(),
    claims?.role === "EMPLOYEE" || claims?.role === "MANAGER" || claims?.role === "ACCOUNTANT"
      ? loadEmployeeHome(claims.sub, today, year, month.start, month.end)
      : Promise.resolve(null),
  ]);
  if (!home) return null;

  const showAttendance = home.attendanceEnabled;
  const { balances, leaves, pendingLeave, openHr, openDocs, announcement, payslip, office } = home;
  const todayAttendance = home.today;
  const presentDays = home.presentDays;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={user.role === "MANAGER" ? "Manager" : user.role === "ACCOUNTANT" ? "Accountant" : "Employee"}
        title={`Good to see you, ${user.firstName}`}
        description={
          user.role === "MANAGER"
            ? "This is your own attendance, leave, and pay. Team is where you add and manage the people who report to you."
            : user.role === "ACCOUNTANT"
              ? "This is your own attendance, leave, and pay. Payroll is where you manage everyone else's payslips."
              : showAttendance
                ? "Track attendance, leave balance, payslips, and anything you have asked HR to handle."
                : "Track leave balance, payslips, and anything you have asked HR to handle."
        }
        action={
          user.role === "MANAGER" ? (
            <Link className="text-sm font-semibold text-teal" href="/manager/team">Manage team</Link>
          ) : user.role === "ACCOUNTANT" ? (
            <Link className="text-sm font-semibold text-teal" href="/accountant">Payroll</Link>
          ) : undefined
        }
      />
      <Workflow />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Open requests" value={pendingLeave + openHr + openDocs} hint="Leave, HR, and documents" tone="amber" />
        {showAttendance ? (
          <Stat label="Days worked" value={presentDays} hint={formatMonth(month.year, month.month)} tone="ink" />
        ) : null}
        <Stat label="Latest net pay" value={payslip ? formatMoney(payslip.netPay) : "—"} hint={payslip ? formatMonth(payslip.year, payslip.month) : "No payslip yet"} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {showAttendance ? (
          <AttendanceClock
            dateLabel={formatDate(`${today}T00:00:00.000Z`)}
            checkIn={todayAttendance?.checkIn ?? null}
            checkOut={todayAttendance?.checkOut ?? null}
            checkInLocation={
              todayAttendance?.checkInLat != null && todayAttendance.checkInLng != null
                ? { latitude: todayAttendance.checkInLat, longitude: todayAttendance.checkInLng }
                : null
            }
            checkOutLocation={
              todayAttendance?.checkOutLat != null && todayAttendance.checkOutLng != null
                ? { latitude: todayAttendance.checkOutLat, longitude: todayAttendance.checkOutLng }
                : null
            }
            status={todayAttendance?.status ?? null}
            office={office}
            remoteClock={user.remoteClock || home.clockAnywhere}
          />
        ) : null}
        <Panel className={showAttendance ? "lg:col-span-2" : "lg:col-span-3"} title="Leave balances" description={`${year} allowance. Pending requests are not deducted until approved.`}>
          <div className="grid gap-3 sm:grid-cols-2">
            {balances.map((balance) => (
              <div key={balance.id} className="rounded-xl bg-sand px-4 py-3">
                <p className="text-sm text-mist">{balance.type}</p>
                <p className="mt-1 text-lg font-semibold">
                  {balance.type === "Unpaid" ? `${balance.used} used` : `${balance.total - balance.used} left`}
                </p>
                <p className="text-xs text-mist">{balance.used} used of {balance.type === "Unpaid" ? "unlimited" : balance.total}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Latest announcement" action={<Link className="text-sm font-semibold text-teal" href="/employee/notifications">Notifications</Link>}>
          {announcement ? (
            <div>
              <p className="font-semibold">{announcement.title}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-mist">{announcement.body}</p>
              <p className="mt-3 text-xs text-mist">{fullName(announcement)} · {formatDate(announcement.createdAt)}</p>
            </div>
          ) : (
            <p className="text-sm text-mist">No announcements yet.</p>
          )}
        </Panel>
        <Panel title="Recent leave" action={<Link className="text-sm font-semibold text-teal" href="/employee/leave">View leave</Link>}>
          <ul className="space-y-3">
            {leaves.map((leave) => (
              <li key={leave.id} className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{leave.type} · {leave.days} day(s)</p>
                  <p className="text-sm text-mist">{formatDate(leave.startDate)} – {formatDate(leave.endDate)}</p>
                </div>
                <StatusBadge value={leave.status} />
              </li>
            ))}
            {!leaves.length ? <p className="text-sm text-mist">No leave requests yet.</p> : null}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
