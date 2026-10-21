"use server";

import { getSessionClaims, requireUser } from "@/lib/auth";
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

type RosterPerson = {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  department: string;
  remoteClock: boolean;
  checkIn: string | null;
  checkOut: string | null;
  checkInLat: number | null;
  checkInLng: number | null;
  checkInAccuracy: number | null;
  checkOutLat: number | null;
  checkOutLng: number | null;
  checkOutAccuracy: number | null;
  status: string | null;
};

type RosterSqlRow = {
  clockAnywhere: boolean | null;
  attendanceEnabled: boolean | null;
  rows: RosterPerson[] | string | null;
};

export async function loadTodayRoster(): Promise<TodayRoster> {
  const claims = await getSessionClaims();
  const today = todayKey();
  const day = parseKey(today);
  const [, loadedRows] = await Promise.all([
    requireUser("ADMIN"),
    claims?.role === "ADMIN" ? prisma.$queryRaw<RosterSqlRow[]>`
    SELECT
      (SELECT "clockAnywhere" FROM "OrgSetting" WHERE id = ${ORG_SETTING_ID}) AS "clockAnywhere",
      (SELECT "attendanceEnabled" FROM "OrgSetting" WHERE id = ${ORG_SETTING_ID}) AS "attendanceEnabled",
      (
        SELECT COALESCE(json_agg(json_build_object(
          'id', e.id,
          'firstName', e."firstName",
          'lastName', e."lastName",
          'employeeCode', e."employeeCode",
          'department', e.department,
          'remoteClock', e."remoteClock",
          'checkIn', a."checkIn",
          'checkOut', a."checkOut",
          'checkInLat', a."checkInLat",
          'checkInLng', a."checkInLng",
          'checkInAccuracy', a."checkInAccuracy",
          'checkOutLat', a."checkOutLat",
          'checkOutLng', a."checkOutLng",
          'checkOutAccuracy', a."checkOutAccuracy",
          'status', a.status
        ) ORDER BY e."firstName", e."lastName"), '[]'::json)
        FROM "User" e
        LEFT JOIN "Attendance" a ON a."userId" = e.id AND a.date = ${day}
        WHERE e.role = 'EMPLOYEE' AND e.status = 'Active'
      ) AS rows
  ` : Promise.resolve(null),
  ]);
  const loaded = loadedRows ?? [];
  const packet = loaded[0];
  const people: RosterPerson[] = packet?.rows == null ? [] : typeof packet.rows === "string" ? JSON.parse(packet.rows) as RosterPerson[] : packet.rows;
  const rows = (people ?? []).map((employee) => {
    const checkIn = employee.checkIn ?? null;
    const checkOut = employee.checkOut ?? null;
    let state: RosterState = "Not in";
    if (checkIn && !checkOut) state = "Working";
    else if (checkOut) state = "Checked out";
    else if (employee.status === "On Leave") state = "On leave";
    else if (employee.status === "Absent") state = "Absent";
    return {
      id: employee.id,
      name: fullName(employee),
      code: employee.employeeCode,
      department: employee.department,
      remote: employee.remoteClock,
      state,
      checkIn,
      checkOut,
      checkInLat: employee.checkInLat ?? null,
      checkInLng: employee.checkInLng ?? null,
      checkInAccuracy: employee.checkInAccuracy ?? null,
      checkOutLat: employee.checkOutLat ?? null,
      checkOutLng: employee.checkOutLng ?? null,
      checkOutAccuracy: employee.checkOutAccuracy ?? null,
    };
  });
  rows.sort((a, b) => rank[a.state] - rank[b.state] || a.name.localeCompare(b.name));
  return {
    dateLabel: formatDate(`${today}T00:00:00.000Z`),
    asOf: nowStamp(),
    clockAnywhere: Boolean(packet?.clockAnywhere),
    attendanceEnabled: packet?.attendanceEnabled !== false,
    working: rows.filter((row) => row.state === "Working").length,
    checkedOut: rows.filter((row) => row.state === "Checked out").length,
    notIn: rows.filter((row) => row.state === "Not in" || row.state === "Absent").length,
    rows,
  };
}
