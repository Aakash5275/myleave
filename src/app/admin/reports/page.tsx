import { PrintButton } from "@/components/admin-forms";
import { Field, FilterBar, PageHeader, Panel, Stat, inputClass } from "@/components/ui";
import { departmentOptions } from "@/lib/constants";
import { getSessionClaims, requireUser } from "@/lib/auth";
import { formatMoney, formatMonth, monthKeys, queryValue, todayKey } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { loadReport } from "@/server/home";

export const metadata = { title: "Reports" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const claims = await getSessionClaims();
  const params = await searchParams;
  const monthValue = queryValue(params.month) || todayKey().slice(0, 7);
  const department = queryValue(params.department);
  const range = monthKeys(monthValue) ?? monthKeys(todayKey().slice(0, 7))!;
  const [, report, storedDepartments] = await Promise.all([
    requireUser("ADMIN"),
    claims?.role === "ADMIN"
      ? loadReport(
          department,
          new Date(`${range.start}T00:00:00.000Z`),
          new Date(`${range.end}T00:00:00.000Z`),
          new Date(`${range.end}T23:59:59.000Z`),
          range.year,
          range.month,
        )
      : Promise.resolve(null),
    claims?.role === "ADMIN"
      ? prisma.user.findMany({ where: { role: "EMPLOYEE" }, distinct: ["department"], select: { department: true } })
      : Promise.resolve([]),
  ]);
  if (!report) return null;
  const { people, attendance, leaves, hr, docs } = report;
  const departments = departmentOptions(storedDepartments.map((row) => row.department));

  const headcount = departments.filter((item) => !department || item === department).map((item) => ({
    label: item,
    value: people.filter((person) => person.department === item && person.status === "Active").length,
  }));
  const attendanceRows = ["Present", "Late", "Half Day", "Absent", "On Leave"].map((label) => ({
    label,
    value: attendance.find((row) => row.status === label)?.n ?? 0,
  }));
  const worked = attendanceRows.filter((row) => ["Present", "Late", "Half Day"].includes(row.label)).reduce((sum, row) => sum + row.value, 0);
  const absent = attendanceRows.find((row) => row.label === "Absent")?.value ?? 0;
  const rate = worked + absent === 0 ? null : Math.round((worked / (worked + absent)) * 100);
  const payroll = report.payroll;
  const openOf = (groups: Array<{ status: string; n: number }>) =>
    groups.filter((item) => item.status === "Pending" || item.status === "In Progress").reduce((sum, item) => sum + item.n, 0);

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
            {departments.map((item) => <option key={item}>{item}</option>)}
          </select>
        </Field>
      </FilterBar>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active headcount" value={people.filter((person) => person.status === "Active").length} />
        <Stat label="Attendance rate" value={rate === null ? "—" : `${rate}%`} hint="Present, late, and half day vs absent" />
        <Stat label="Leave requests" value={sumOf(leaves)} hint={`${sumOf(leaves.filter((leave) => leave.status === "Approved" || leave.status === "Resolved"))} approved or resolved`} tone="amber" />
        <Stat label="Issued payroll" value={formatMoney(payroll)} hint={`${report.payslips} payslip(s)`} tone="ink" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Headcount by department"><Bars rows={headcount} /></Panel>
        <Panel title="Attendance mix"><Bars rows={attendanceRows} /></Panel>
        <Panel title="Leave by status"><Bars rows={barsFrom(leaves)} /></Panel>
        <Panel title="HR tickets by status"><Bars rows={barsFrom(hr)} /></Panel>
        <Panel title="Documents by status"><Bars rows={barsFrom(docs)} /></Panel>
        <Panel title="Open work" description="Pending and in progress, across the selected people.">
          <Bars
            rows={[
              { label: "Leave", value: openOf(leaves) },
              { label: "HR tickets", value: openOf(hr) },
              { label: "Documents", value: openOf(docs) },
            ]}
          />
        </Panel>
      </div>
    </div>
  );
}

function sumOf(groups: Array<{ n: number }>) {
  return groups.reduce((sum, item) => sum + item.n, 0);
}

function barsFrom(groups: Array<{ status: string; n: number }>) {
  return groups.length ? groups.map((item) => ({ label: item.status, value: item.n })) : [{ label: "No records", value: 0 }];
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
