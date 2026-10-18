"use server";

import { requireUser } from "@/lib/auth";
import { ORG_SETTING_ID } from "@/lib/geo";
import { formatDate, fullName, nowStamp, parseKey, todayKey } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export type RosterState = "Working" | "Checked out" | "Not in" | "On leave" | "Absent";

export type RosterRow = {
  id: string;
  name: string;
  code: string;
  department: string;
  remote: boolean;
  state: RosterState;
  checkIn: string | null;
  checkOut: string | null;
  checkInLat: number | null;
  checkInLng: number | null;
  checkInAccuracy: number | null;
  checkOutLat: number | null;
  checkOutLng: number | null;
  checkOutAccuracy: number | null;
};

export type TodayRoster = {
  dateLabel: string;
  asOf: string;
  clockAnywhere: boolean;
  attendanceEnabled: boolean;
  working: number;
  checkedOut: number;
  notIn: number;
  rows: RosterRow[];
};

const rank: Record<RosterState, number> = {
  Working: 0,
  "Checked out": 1,
  "Not in": 2,
  "On leave": 3,
  Absent: 4,
};

export async function loadTodayRoster(): Promise<TodayRoster> {
  await requireUser("ADMIN");
  const today = todayKey();
  const [employees, attendance, policy] = await Promise.all([
    prisma.user.findMany({
      where: { role: "EMPLOYEE", status: "Active" },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    prisma.attendance.findMany({ where: { date: parseKey(today) } }),
    prisma.orgSetting.findUnique({ where: { id: ORG_SETTING_ID } }),
  ]);
  const byUser = new Map(attendance.map((row) => [row.userId, row]));
  const rows = employees.map((employee) => {
    const record = byUser.get(employee.id);
    const checkIn = record?.checkIn ?? null;
    const checkOut = record?.checkOut ?? null;
    let state: RosterState = "Not in";
    if (checkIn && !checkOut) state = "Working";
    else if (checkOut) state = "Checked out";
    else if (record?.status === "On Leave") state = "On leave";
    else if (record?.status === "Absent") state = "Absent";
    return {
      id: employee.id,
      name: fullName(employee),
      code: employee.employeeCode,
      department: employee.department,
      remote: employee.remoteClock,
      state,
      checkIn,
      checkOut,
      checkInLat: record?.checkInLat ?? null,
      checkInLng: record?.checkInLng ?? null,
      checkInAccuracy: record?.checkInAccuracy ?? null,
      checkOutLat: record?.checkOutLat ?? null,
      checkOutLng: record?.checkOutLng ?? null,
      checkOutAccuracy: record?.checkOutAccuracy ?? null,
    };
  });
  rows.sort((a, b) => rank[a.state] - rank[b.state] || a.name.localeCompare(b.name));
  return {
    dateLabel: formatDate(`${today}T00:00:00.000Z`),
    asOf: nowStamp(),
    clockAnywhere: Boolean(policy?.clockAnywhere),
    attendanceEnabled: policy?.attendanceEnabled !== false,
    working: rows.filter((row) => row.state === "Working").length,
    checkedOut: rows.filter((row) => row.state === "Checked out").length,
    notIn: rows.filter((row) => row.state === "Not in" || row.state === "Absent").length,
    rows,
  };
}
