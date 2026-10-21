import Link from "next/link";
import { LiveRoster } from "@/components/live-roster";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader, Panel, Stat, Workflow } from "@/components/ui";
import { getSessionClaims, requireUser } from "@/lib/auth";
import { formatDate, formatMoney, fullName, todayKey } from "@/lib/format";
import { loadAdminHome } from "@/server/home";
import { loadTodayRoster } from "@/server/roster";

export const metadata = { title: "Admin dashboard" };

export default async function AdminDashboard() {
  const claims = await getSessionClaims();
  const today = todayKey();
  const [roster, home] = await Promise.all([
    claims?.role === "ADMIN" ? loadTodayRoster() : Promise.resolve(null),
    claims?.role === "ADMIN" ? loadAdminHome(Number(today.slice(0, 4)), Number(today.slice(5, 7))) : Promise.resolve(null),
    requireUser("ADMIN"),
  ]);
  if (!roster || !home) return null;
  const { employees, pendingLeave, openHr, pendingDocs, payroll, leaves, tickets, documents } = home;

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
      <LiveRoster initial={roster} />
      <div className="grid gap-4 lg:grid-cols-2">
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
          title: `${fullName(item)} · ${item.type}`,
          meta: `${formatDate(item.startDate)} · ${item.days} day(s)`,
          status: item.status,
        }))} />
        <Queue title="HR tickets" href="/admin/requests?status=Pending" rows={tickets.map((item) => ({
          id: item.id,
          title: item.subject,
          meta: fullName(item),
          status: item.status,
        }))} />
        <Queue title="Documents" href="/admin/documents?status=Pending" rows={documents.map((item) => ({
          id: item.id,
          title: item.docType,
          meta: fullName(item),
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
