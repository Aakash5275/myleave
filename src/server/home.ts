import { prisma } from "@/lib/prisma";
import { parseKey } from "@/lib/format";

function asNumber(value: number | bigint | null | undefined) {
  return Number(value ?? 0);
}

function asList<T>(value: T[] | string | null | undefined): T[] {
  if (!value) return [];
  if (typeof value === "string") return JSON.parse(value) as T[];
  return value;
}

export type EmployeeHome = {
  presentDays: number;
  pendingLeave: number;
  openHr: number;
  openDocs: number;
  balances: Array<{ id: string; type: string; total: number; used: number }>;
  leaves: Array<{ id: string; type: string; startDate: string; endDate: string; days: number; status: string }>;
  today: {
    checkIn: string | null;
    checkOut: string | null;
    checkInLat: number | null;
    checkInLng: number | null;
    checkOutLat: number | null;
    checkOutLng: number | null;
    status: string | null;
  } | null;
  announcement: { title: string; body: string; createdAt: string; firstName: string; lastName: string } | null;
  payslip: { netPay: number; year: number; month: number } | null;
  office: { name: string; latitude: number; longitude: number; radiusM: number } | null;
  clockAnywhere: boolean;
  attendanceEnabled: boolean;
};

type EmployeeHomeRow = {
  presentDays: number;
  pendingLeave: number;
  openHr: number;
  openDocs: number;
  balances: EmployeeHome["balances"] | string | null;
  leaves: EmployeeHome["leaves"] | string | null;
  today: EmployeeHome["today"] | string | null;
  announcement: EmployeeHome["announcement"] | string | null;
  payslip: EmployeeHome["payslip"] | string | null;
  officeName: string | null;
  officeLat: number | null;
  officeLng: number | null;
  officeRadius: number | null;
  clockAnywhere: boolean | null;
  attendanceEnabled: boolean | null;
};

function asObject<T>(value: T | string | null | undefined): T | null {
  if (!value) return null;
  if (typeof value === "string") return JSON.parse(value) as T;
  return value;
}

export async function loadEmployeeHome(userId: string, today: string, year: number, monthStart: string, monthEnd: string): Promise<EmployeeHome> {
  const day = parseKey(today);
  const start = parseKey(monthStart);
  const end = parseKey(monthEnd);
  const rows = await prisma.$queryRaw<EmployeeHomeRow[]>`
    SELECT
      (
        SELECT COUNT(*)::int FROM "Attendance" a
        WHERE a."userId" = ${userId}
          AND a.date >= ${start} AND a.date <= ${end}
          AND a.status IN ('Present', 'Late', 'Half Day')
      ) AS "presentDays",
      (
        SELECT COUNT(*)::int FROM "LeaveRequest"
        WHERE "userId" = ${userId} AND status IN ('Pending', 'In Progress')
      ) AS "pendingLeave",
      (
        SELECT COUNT(*)::int FROM "HrRequest"
        WHERE "userId" = ${userId} AND status IN ('Pending', 'In Progress')
      ) AS "openHr",
      (
        SELECT COUNT(*)::int FROM "DocumentRequest"
        WHERE "userId" = ${userId} AND status IN ('Pending', 'In Progress')
      ) AS "openDocs",
      (
        SELECT COALESCE(json_agg(json_build_object(
          'id', b.id, 'type', b.type, 'total', b.total, 'used', b.used
        ) ORDER BY b.type), '[]'::json)
        FROM "LeaveBalance" b
        WHERE b."userId" = ${userId} AND b.year = ${year}
      ) AS balances,
      (
        SELECT COALESCE(json_agg(json_build_object(
          'id', s.id, 'type', s.type, 'startDate', s."startDate", 'endDate', s."endDate", 'days', s.days, 'status', s.status
        ) ORDER BY s."createdAt" DESC), '[]'::json)
        FROM (
          SELECT id, type, "startDate", "endDate", days, status, "createdAt"
          FROM "LeaveRequest"
          WHERE "userId" = ${userId}
          ORDER BY "createdAt" DESC
          LIMIT 5
        ) s
      ) AS leaves,
      (
        SELECT json_build_object(
          'checkIn', a."checkIn",
          'checkOut', a."checkOut",
          'checkInLat', a."checkInLat",
          'checkInLng', a."checkInLng",
          'checkOutLat', a."checkOutLat",
          'checkOutLng', a."checkOutLng",
          'status', a.status
        )
        FROM "Attendance" a
        WHERE a."userId" = ${userId} AND a.date = ${day}
      ) AS today,
      (
        SELECT json_build_object(
          'title', an.title,
          'body', an.body,
          'createdAt', an."createdAt",
          'firstName', au."firstName",
          'lastName', au."lastName"
        )
        FROM "Announcement" an
        JOIN "User" au ON au.id = an."authorId"
        ORDER BY an.pinned DESC, an."createdAt" DESC
        LIMIT 1
      ) AS announcement,
      (
        SELECT json_build_object('netPay', p."netPay", 'year', p.year, 'month', p.month)
        FROM "Payslip" p
        WHERE p."userId" = ${userId} AND p.status = 'Issued'
        ORDER BY p.year DESC, p.month DESC
        LIMIT 1
      ) AS payslip,
      w.name AS "officeName",
      w.latitude AS "officeLat",
      w.longitude AS "officeLng",
      w."radiusM" AS "officeRadius",
      o."clockAnywhere" AS "clockAnywhere",
      o."attendanceEnabled" AS "attendanceEnabled"
    FROM (SELECT 1) AS seed
    LEFT JOIN "Workplace" w ON w.id = 'default'
    LEFT JOIN "OrgSetting" o ON o.id = 'default'
  `;
  const row = rows[0];
  const payslip = asObject(row?.payslip);
  return {
    presentDays: asNumber(row?.presentDays),
    pendingLeave: asNumber(row?.pendingLeave),
    openHr: asNumber(row?.openHr),
    openDocs: asNumber(row?.openDocs),
    balances: asList(row?.balances).map((balance) => ({ ...balance, total: asNumber(balance.total), used: asNumber(balance.used) })),
    leaves: asList(row?.leaves).map((leave) => ({ ...leave, days: asNumber(leave.days) })),
    today: asObject(row?.today),
    announcement: asObject(row?.announcement),
    payslip: payslip ? { ...payslip, netPay: asNumber(payslip.netPay), year: asNumber(payslip.year), month: asNumber(payslip.month) } : null,
    office: row?.officeLat == null || row.officeLng == null ? null : {
      name: row.officeName ?? "Office",
      latitude: Number(row.officeLat),
      longitude: Number(row.officeLng),
      radiusM: asNumber(row.officeRadius),
    },
    clockAnywhere: Boolean(row?.clockAnywhere),
    attendanceEnabled: row?.attendanceEnabled !== false,
  };
}

export type AdminHome = {
  employees: number;
  pendingLeave: number;
  openHr: number;
  pendingDocs: number;
  payroll: number;
  leaves: Array<{ id: string; type: string; startDate: string; days: number; status: string; firstName: string; lastName: string }>;
  tickets: Array<{ id: string; subject: string; status: string; firstName: string; lastName: string }>;
  documents: Array<{ id: string; docType: string; status: string; firstName: string; lastName: string }>;
};

type AdminHomeRow = {
  employees: number;
  pendingLeave: number;
  openHr: number;
  pendingDocs: number;
  payroll: number;
  leaves: AdminHome["leaves"] | string | null;
  tickets: AdminHome["tickets"] | string | null;
  documents: AdminHome["documents"] | string | null;
};

export async function loadAdminHome(year: number, month: number): Promise<AdminHome> {
  const rows = await prisma.$queryRaw<AdminHomeRow[]>`
    SELECT
      (SELECT COUNT(*)::int FROM "User" WHERE role = 'EMPLOYEE' AND status = 'Active') AS employees,
      (SELECT COUNT(*)::int FROM "LeaveRequest" WHERE status IN ('Pending', 'In Progress')) AS "pendingLeave",
      (SELECT COUNT(*)::int FROM "HrRequest" WHERE status IN ('Pending', 'In Progress')) AS "openHr",
      (SELECT COUNT(*)::int FROM "DocumentRequest" WHERE status IN ('Pending', 'In Progress')) AS "pendingDocs",
      (
        SELECT COALESCE(SUM("netPay"), 0)::int FROM "Payslip"
        WHERE status = 'Issued' AND year = ${year} AND month = ${month}
      ) AS payroll,
      (
        SELECT COALESCE(json_agg(json_build_object(
          'id', s.id, 'type', s.type, 'startDate', s."startDate", 'days', s.days, 'status', s.status,
          'firstName', s."firstName", 'lastName', s."lastName"
        ) ORDER BY s."createdAt"), '[]'::json)
        FROM (
          SELECT l.id, l.type, l."startDate", l.days, l.status, l."createdAt", u."firstName", u."lastName"
          FROM "LeaveRequest" l
          JOIN "User" u ON u.id = l."userId"
          WHERE l.status IN ('Pending', 'In Progress')
          ORDER BY l."createdAt" ASC
          LIMIT 5
        ) s
      ) AS leaves,
      (
        SELECT COALESCE(json_agg(json_build_object(
          'id', s.id, 'subject', s.subject, 'status', s.status, 'firstName', s."firstName", 'lastName', s."lastName"
        ) ORDER BY s."createdAt"), '[]'::json)
        FROM (
          SELECT h.id, h.subject, h.status, h."createdAt", u."firstName", u."lastName"
          FROM "HrRequest" h
          JOIN "User" u ON u.id = h."userId"
          WHERE h.status IN ('Pending', 'In Progress')
          ORDER BY h."createdAt" ASC
          LIMIT 5
        ) s
      ) AS tickets,
      (
        SELECT COALESCE(json_agg(json_build_object(
          'id', s.id, 'docType', s."docType", 'status', s.status, 'firstName', s."firstName", 'lastName', s."lastName"
        ) ORDER BY s."createdAt"), '[]'::json)
        FROM (
          SELECT d.id, d."docType", d.status, d."createdAt", u."firstName", u."lastName"
          FROM "DocumentRequest" d
          JOIN "User" u ON u.id = d."userId"
          WHERE d.status IN ('Pending', 'In Progress')
          ORDER BY d."createdAt" ASC
          LIMIT 5
        ) s
      ) AS documents
  `;
  const row = rows[0];
  return {
    employees: asNumber(row?.employees),
    pendingLeave: asNumber(row?.pendingLeave),
    openHr: asNumber(row?.openHr),
    pendingDocs: asNumber(row?.pendingDocs),
    payroll: asNumber(row?.payroll),
    leaves: asList(row?.leaves).map((leave) => ({ ...leave, days: asNumber(leave.days) })),
    tickets: asList(row?.tickets),
    documents: asList(row?.documents),
  };
}

export type ReportSnapshot = {
  people: Array<{ department: string; status: string }>;
  attendance: Array<{ status: string; n: number }>;
  leaves: Array<{ status: string; n: number }>;
  hr: Array<{ status: string; n: number }>;
  docs: Array<{ status: string; n: number }>;
  payroll: number;
  payslips: number;
};

type ReportRow = {
  people: ReportSnapshot["people"] | string | null;
  attendance: ReportSnapshot["attendance"] | string | null;
  leaves: ReportSnapshot["leaves"] | string | null;
  hr: ReportSnapshot["hr"] | string | null;
  docs: ReportSnapshot["docs"] | string | null;
  payroll: number;
  payslips: number;
};

export async function loadReport(department: string, start: Date, end: Date, createdEnd: Date, year: number, month: number): Promise<ReportSnapshot> {
  const rows = await prisma.$queryRaw<ReportRow[]>`
    WITH people AS (
      SELECT id, department, status
      FROM "User"
      WHERE role = 'EMPLOYEE'
        AND (${department} = '' OR department = ${department})
    )
    SELECT
      (SELECT COALESCE(json_agg(json_build_object('department', department, 'status', status)), '[]'::json) FROM people) AS people,
      (
        SELECT COALESCE(json_agg(json_build_object('status', status, 'n', n)), '[]'::json)
        FROM (
          SELECT a.status, COUNT(*)::int AS n
          FROM "Attendance" a
          WHERE a."userId" IN (SELECT id FROM people)
            AND a.date >= ${start} AND a.date <= ${end}
          GROUP BY a.status
        ) s
      ) AS attendance,
      (
        SELECT COALESCE(json_agg(json_build_object('status', status, 'n', n)), '[]'::json)
        FROM (
          SELECT l.status, COUNT(*)::int AS n
          FROM "LeaveRequest" l
          WHERE l."userId" IN (SELECT id FROM people)
            AND l."startDate" <= ${end}
            AND l."endDate" >= ${start}
          GROUP BY l.status
        ) s
      ) AS leaves,
      (
        SELECT COALESCE(json_agg(json_build_object('status', status, 'n', n)), '[]'::json)
        FROM (
          SELECT h.status, COUNT(*)::int AS n
          FROM "HrRequest" h
          WHERE h."userId" IN (SELECT id FROM people)
            AND h."createdAt" >= ${start} AND h."createdAt" <= ${createdEnd}
          GROUP BY h.status
        ) s
      ) AS hr,
      (
        SELECT COALESCE(json_agg(json_build_object('status', status, 'n', n)), '[]'::json)
        FROM (
          SELECT d.status, COUNT(*)::int AS n
          FROM "DocumentRequest" d
          WHERE d."userId" IN (SELECT id FROM people)
            AND d."createdAt" >= ${start} AND d."createdAt" <= ${createdEnd}
          GROUP BY d.status
        ) s
      ) AS docs,
      (
        SELECT COALESCE(SUM(p."netPay"), 0)::int
        FROM "Payslip" p
        WHERE p."userId" IN (SELECT id FROM people)
          AND p.year = ${year} AND p.month = ${month} AND p.status = 'Issued'
      ) AS payroll,
      (
        SELECT COUNT(*)::int
        FROM "Payslip" p
        WHERE p."userId" IN (SELECT id FROM people)
          AND p.year = ${year} AND p.month = ${month} AND p.status = 'Issued'
      ) AS payslips
  `;
  const row = rows[0];
  const groups = (value: ReportSnapshot["attendance"] | string | null | undefined) =>
    asList(value).map((item) => ({ ...item, n: asNumber(item.n) }));
  return {
    people: asList(row?.people),
    attendance: groups(row?.attendance),
    leaves: groups(row?.leaves),
    hr: groups(row?.hr),
    docs: groups(row?.docs),
    payroll: asNumber(row?.payroll),
    payslips: asNumber(row?.payslips),
  };
}
