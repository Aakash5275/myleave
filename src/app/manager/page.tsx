import Link from "next/link";
import { PageHeader, Stat } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { parseKey, todayKey } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Manager" };

export default async function ManagerHome() {
  const manager = await requireUser("MANAGER");
  const today = todayKey();
  const team = await prisma.user.findMany({
    where: { role: "EMPLOYEE", managerId: manager.id, status: "Active" },
    select: { id: true },
  });
  const records = team.length
    ? await prisma.attendance.findMany({
        where: { userId: { in: team.map((person) => person.id) }, date: parseKey(today) },
        select: { approvedAt: true },
      })
    : [];
  const waiting = records.filter((record) => !record.approvedAt).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Manager"
        title={`Hello, ${manager.firstName}`}
        description="Manage the people who report to you, and use the same leave, attendance, pay, and profile tools as an employee."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Your team" value={team.length} hint="Active employees" />
        <Stat label="Marked today" value={records.length} hint={today} tone="ink" />
        <Stat label="Waiting for approval" value={waiting} hint="Today’s unmarked approvals" tone="amber" />
      </div>
      <div className="flex flex-wrap gap-3">
        <Link className="text-sm font-semibold text-teal" href="/manager/team">Manage team</Link>
        <Link className="text-sm font-semibold text-teal" href="/manager/attendance">Approve attendance</Link>
      </div>
    </div>
  );
}
