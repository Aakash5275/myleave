import { PrintButton } from "@/components/admin-forms";
import { Field, FilterBar, PageHeader, Panel, Stat, inputClass } from "@/components/ui";
import { DEPARTMENTS } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { formatMoney, formatMonth, monthKeys, queryValue, todayKey } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Reports" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser("ADMIN");
  const params = await searchParams;
  const monthValue = queryValue(params.month) || todayKey().slice(0, 7);
  const department = queryValue(params.department);
  const range = monthKeys(monthValue) ?? monthKeys(todayKey().slice(0, 7))!;
  const people = await prisma.user.findMany({
    where: { role: "EMPLOYEE", ...(department ? { department } : {}) },
  });
  const ids = people.map((person) => person.id);
  const scope = ids.length ? ids : ["__none__"];
  const [attendance, leaves, hr, docs, payslips] = await Promise.all([
    prisma.attendance.findMany({
      where: { userId: { in: scope }, date: { gte: new Date(`${range.start}T00:00:00.000Z`), lte: new Date(`${range.end}T00:00:00.000Z`) } },
    }),
    prisma.leaveRequest.findMany({
      where: {
        userId: { in: scope },
        startDate: { lte: new Date(`${range.end}T00:00:00.000Z`) },
        endDate: { gte: new Date(`${range.start}T00:00:00.000Z`) },
      },
    }),
    prisma.hrRequest.findMany({
      where: { userId: { in: scope }, createdAt: { gte: new Date(`${range.start}T00:00:00.000Z`), lte: new Date(`${range.end}T23:59:59.000Z`) } },
    }),
    prisma.documentRequest.findMany({
      where: { userId: { in: scope }, createdAt: { gte: new Date(`${range.start}T00:00:00.000Z`), lte: new Date(`${range.end}T23:59:59.000Z`) } },
    }),
    prisma.payslip.findMany({ where: { userId: { in: scope }, year: range.year, month: range.month, status: "Issued" } }),
  ]);

  const headcount = DEPARTMENTS.filter((item) => !department || item === department).map((item) => ({
    label: item,
    value: people.filter((person) => person.department === item && person.status === "Active").length,
  }));
  const attendanceRows = ["Present", "Late", "Half Day", "Absent", "On Leave"].map((label) => ({
    label,
    value: attendance.filter((row) => row.status === label).length,
  }));
  const worked = attendanceRows.filter((row) => ["Present", "Late", "Half Day"].includes(row.label)).reduce((sum, row) => sum + row.value, 0);
  const absent = attendanceRows.find((row) => row.label === "Absent")?.value ?? 0;
  const rate = worked + absent === 0 ? null : Math.round((worked / (worked + absent)) * 100);
  const payroll = payslips.reduce((sum, slip) => sum + slip.netPay, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Insights"
        title="Reports"
        description={`Figures for ${formatMonth(range.year, range.month)}${department ? ` · ${department}` : ""}.`}
        action={<PrintButton label="Print report" />}
      />
      <FilterBar clearHref="/admin/reports">
        <Field label="Month">
          <input className={inputClass} type="month" name="month" defaultValue={`${range.year}-${String(range.month).padStart(2, "0")}`} />
        </Field>
        <Field label="Department">
          <select className={inputClass} name="department" defaultValue={department}>
            <option value="">All departments</option>
            {DEPARTMENTS.map((item) => <option key={item}>{item}</option>)}
          </select>
        </Field>
      </FilterBar>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active headcount" value={people.filter((person) => person.status === "Active").length} />
        <Stat label="Attendance rate" value={rate === null ? "—" : `${rate}%`} hint="Present, late, and half day vs absent" />
        <Stat label="Leave requests" value={leaves.length} hint={`${leaves.filter((leave) => leave.status === "Approved" || leave.status === "Resolved").length} approved or resolved`} tone="amber" />
        <Stat label="Issued payroll" value={formatMoney(payroll)} hint={`${payslips.length} payslip(s)`} tone="ink" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Headcount by department"><Bars rows={headcount} /></Panel>
        <Panel title="Attendance mix"><Bars rows={attendanceRows} /></Panel>
        <Panel title="Leave by status"><Bars rows={countBy(leaves, (item) => item.status)} /></Panel>
        <Panel title="HR tickets by status"><Bars rows={countBy(hr, (item) => item.status)} /></Panel>
        <Panel title="Documents by status"><Bars rows={countBy(docs, (item) => item.status)} /></Panel>
        <Panel title="Open work" description="Pending and in progress, across the selected people.">
          <Bars
            rows={[
              { label: "Leave", value: leaves.filter((item) => item.status === "Pending" || item.status === "In Progress").length },
              { label: "HR tickets", value: hr.filter((item) => item.status === "Pending" || item.status === "In Progress").length },
              { label: "Documents", value: docs.filter((item) => item.status === "Pending" || item.status === "In Progress").length },
            ]}
          />
        </Panel>
      </div>
    </div>
  );
}

function countBy<T>(items: T[], pick: (item: T) => string) {
  const map = new Map<string, number>();
  for (const item of items) map.set(pick(item), (map.get(pick(item)) ?? 0) + 1);
  const rows = [...map.entries()].map(([label, value]) => ({ label, value }));
  return rows.length ? rows : [{ label: "No records", value: 0 }];
}

function Bars({ rows }: { rows: Array<{ label: string; value: number }> }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-1 flex justify-between text-sm">
            <span>{row.label}</span>
            <span className="font-medium">{row.value}</span>
          </div>
          <div className="h-2 rounded-full bg-sand">
            <div className="h-2 rounded-full bg-teal" style={{ width: `${Math.round((row.value / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
