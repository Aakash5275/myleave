import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader, Panel, Stat, Workflow } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDate, formatMoney, fullName, todayKey } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Admin dashboard" };

export default async function AdminDashboard() {
  await requireUser("ADMIN");
  const today = todayKey();
  const [employees, pendingLeave, openHr, pendingDocs, attendance, leaves, tickets, documents, payslips] =
    await Promise.all([
      prisma.user.count({ where: { role: "EMPLOYEE", status: "Active" } }),
      prisma.leaveRequest.count({ where: { status: { in: ["Pending", "In Progress"] } } }),
      prisma.hrRequest.count({ where: { status: { in: ["Pending", "In Progress"] } } }),
      prisma.documentRequest.count({ where: { status: { in: ["Pending", "In Progress"] } } }),
      prisma.attendance.findMany({ where: { date: new Date(`${today}T00:00:00.000Z`) } }),
      prisma.leaveRequest.findMany({
        where: { status: { in: ["Pending", "In Progress"] } },
        include: { user: true },
        orderBy: { createdAt: "asc" },
        take: 5,
      }),
      prisma.hrRequest.findMany({
        where: { status: { in: ["Pending", "In Progress"] } },
        include: { user: true },
        orderBy: { createdAt: "asc" },
        take: 5,
      }),
      prisma.documentRequest.findMany({
        where: { status: { in: ["Pending", "In Progress"] } },
        include: { user: true },
        orderBy: { createdAt: "asc" },
        take: 5,
      }),
      prisma.payslip.findMany({ where: { status: "Issued", year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) } }),
    ]);
  const present = attendance.filter((row) => ["Present", "Late", "Half Day"].includes(row.status)).length;
  const payroll = payslips.reduce((sum, slip) => sum + slip.netPay, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Today’s queue"
        description="Review what employees have submitted. Updating a status notifies them."
      />
      <Workflow />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active employees" value={employees} />
        <Stat label="Leave to review" value={pendingLeave} tone="amber" hint="Pending or in progress" />
        <Stat label="Open HR tickets" value={openHr} tone="ink" />
        <Stat label="Documents waiting" value={pendingDocs} tone="rose" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Checked in today" description={`${present} present, late, or half day · ${attendance.length} records`}>
          <Link className="text-sm font-semibold text-teal" href={`/admin/attendance?date=${today}`}>Open roster</Link>
        </Panel>
        <Panel title="Payroll this month" description={formatMoney(payroll)}>
          <Link className="text-sm font-semibold text-teal" href="/admin/payroll">Manage payslips</Link>
        </Panel>
        <Panel title="Reports" description="Headcount, attendance, requests, and pay.">
          <Link className="text-sm font-semibold text-teal" href="/admin/reports">View reports</Link>
        </Panel>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Queue title="Leave" href="/admin/leave?status=Pending" rows={leaves.map((item) => ({
          id: item.id,
          title: `${fullName(item.user)} · ${item.type}`,
          meta: `${formatDate(item.startDate)} · ${item.days} day(s)`,
          status: item.status,
        }))} />
        <Queue title="HR tickets" href="/admin/requests?status=Pending" rows={tickets.map((item) => ({
          id: item.id,
          title: item.subject,
          meta: fullName(item.user),
          status: item.status,
        }))} />
        <Queue title="Documents" href="/admin/documents?status=Pending" rows={documents.map((item) => ({
          id: item.id,
          title: item.docType,
          meta: fullName(item.user),
          status: item.status,
        }))} />
      </div>
    </div>
  );
}

function Queue({
  title,
  href,
  rows,
}: {
  title: string;
  href: string;
  rows: Array<{ id: string; title: string; meta: string; status: string }>;
}) {
  return (
    <Panel title={title} action={<Link className="text-sm font-semibold text-teal" href={href}>Review</Link>}>
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">{row.title}</p>
              <p className="text-sm text-mist">{row.meta}</p>
            </div>
            <StatusBadge value={row.status} />
          </li>
        ))}
        {!rows.length ? <p className="text-sm text-mist">Nothing waiting.</p> : null}
      </ul>
    </Panel>
  );
}
