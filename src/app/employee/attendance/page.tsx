import { StatusBadge } from "@/components/status-badge";
import { Empty, Field, FilterBar, PageHeader, Stat, inputClass, td, th } from "@/components/ui";
import { ATTENDANCE_STATUSES } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { dateKey, formatDate, monthKeys, parseKey, queryValue, todayKey, weekdayLabels } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Attendance" };

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser("EMPLOYEE");
  const params = await searchParams;
  const monthValue = queryValue(params.month) || todayKey().slice(0, 7);
  const status = queryValue(params.status);
  const range = monthKeys(monthValue) ?? monthKeys(todayKey().slice(0, 7))!;
  const records = await prisma.attendance.findMany({
    where: {
      userId: user.id,
      date: { gte: parseKey(range.start), lte: parseKey(range.end) },
      ...(status ? { status } : {}),
    },
    orderBy: { date: "asc" },
  });
  const byDay = new Map(records.map((record) => [dateKey(record.date), record]));
  const firstDow = parseKey(range.start).getUTCDay();
  const cells = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: Number(range.end.slice(8)) }, (_, index) => {
      const day = String(index + 1).padStart(2, "0");
      return `${range.start.slice(0, 8)}${day}`;
    }),
  ];
  const counts = ATTENDANCE_STATUSES.map((item) => ({
    label: item,
    value: records.filter((record) => record.status === item).length,
  }));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Time" title="Attendance" description="Your month at a glance. Check in from the dashboard on working days." />
      <FilterBar clearHref="/employee/attendance">
        <Field label="Month">
          <input className={inputClass} type="month" name="month" defaultValue={`${range.year}-${String(range.month).padStart(2, "0")}`} />
        </Field>
        <Field label="Status">
          <select className={inputClass} name="status" defaultValue={status}>
            <option value="">All</option>
            {ATTENDANCE_STATUSES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>
      </FilterBar>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {counts.map((count) => (
          <Stat key={count.label} label={count.label} value={count.value} />
        ))}
      </div>
      <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-mist">
          {weekdayLabels().map((label) => (
            <div key={label} className="py-2">{label}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {cells.map((day, index) => {
            const record = day ? byDay.get(day) : undefined;
            return (
              <div key={day ?? `blank-${index}`} className={`min-h-16 rounded-xl p-2 text-left text-xs ${record ? "bg-sand" : "bg-white"} ${day ? "border border-line" : ""}`}>
                {day ? (
                  <>
                    <p className="font-semibold">{Number(day.slice(8))}</p>
                    {record ? <p className="mt-2 text-[11px] text-mist">{record.status}</p> : null}
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      {records.length ? (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr>
                <th className={th}>Date</th>
                <th className={th}>In</th>
                <th className={th}>Out</th>
                <th className={th}>Status</th>
                <th className={th}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td className={td}>{formatDate(record.date)}</td>
                  <td className={td}>{record.checkIn ?? "—"}</td>
                  <td className={td}>{record.checkOut ?? "—"}</td>
                  <td className={td}><StatusBadge value={record.status} /></td>
                  <td className={td}>{record.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="No attendance in this view" body="Try another month or clear the status filter." />
      )}
    </div>
  );
}
