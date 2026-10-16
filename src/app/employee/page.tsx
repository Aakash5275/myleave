import Link from "next/link";
import { AttendanceClock } from "@/components/employee-forms";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader, Panel, Stat, Workflow } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDate, formatMoney, formatMonth, fullName, monthKeys, todayKey } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Dashboard" };

export default async function EmployeeDashboard() {
  const user = await requireUser("EMPLOYEE");
  const today = todayKey();
  const month = monthKeys(today.slice(0, 7))!;
  const year = Number(today.slice(0, 4));
  const [balances, monthAttendance, todayAttendance, leaves, pendingLeave, openHr, openDocs, announcement, payslip] =
    await Promise.all([
      prisma.leaveBalance.findMany({ where: { userId: user.id, year }, orderBy: { type: "asc" } }),
      prisma.attendance.findMany({
        where: { userId: user.id, date: { gte: new Date(`${month.start}T00:00:00.000Z`), lte: new Date(`${month.end}T00:00:00.000Z`) } },
      }),
      prisma.attendance.findUnique({ where: { userId_date: { userId: user.id, date: new Date(`${today}T00:00:00.000Z`) } } }),
      prisma.leaveRequest.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.leaveRequest.count({ where: { userId: user.id, status: { in: ["Pending", "In Progress"] } } }),
      prisma.hrRequest.count({ where: { userId: user.id, status: { in: ["Pending", "In Progress"] } } }),
      prisma.documentRequest.count({ where: { userId: user.id, status: { in: ["Pending", "In Progress"] } } }),
      prisma.announcement.findFirst({ orderBy: [{ pinned: "desc" }, { createdAt: "desc" }], include: { author: true } }),
      prisma.payslip.findFirst({ where: { userId: user.id, status: "Issued" }, orderBy: [{ year: "desc" }, { month: "desc" }] }),
    ]);

  const presentDays = monthAttendance.filter((row) => ["Present", "Late", "Half Day"].includes(row.status)).length;
  const annual = balances.find((balance) => balance.type === "Annual");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Employee"
        title={`Good to see you, ${user.firstName}`}
        description="Track attendance, leave balance, payslips, and anything you have asked HR to handle."
      />
      <Workflow />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Annual leave left" value={annual ? annual.total - annual.used : 0} hint="Approved days already deducted" />
        <Stat label="Open requests" value={pendingLeave + openHr + openDocs} hint="Leave, HR, and documents" tone="amber" />
        <Stat label="Days worked" value={presentDays} hint={formatMonth(month.year, month.month)} tone="ink" />
        <Stat label="Latest net pay" value={payslip ? formatMoney(payslip.netPay) : "—"} hint={payslip ? formatMonth(payslip.year, payslip.month) : "No payslip yet"} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <AttendanceClock
          dateLabel={formatDate(`${today}T00:00:00.000Z`)}
          checkIn={todayAttendance?.checkIn ?? null}
          checkOut={todayAttendance?.checkOut ?? null}
          status={todayAttendance?.status ?? null}
        />
        <Panel className="lg:col-span-2" title="Leave balances" description={`${year} allowance. Pending requests are not deducted until approved.`}>
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
              <p className="mt-3 text-xs text-mist">{fullName(announcement.author)} · {formatDate(announcement.createdAt)}</p>
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
