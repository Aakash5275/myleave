import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COOKIE, homeFor, readSession, type SessionRole } from "@/lib/session";

export const getSessionClaims = cache(async function getSessionClaims() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return readSession(token);
});

type SessionRow = {
  id: string;
  email: string;
  role: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  phone: string;
  department: string;
  jobTitle: string;
  hireDate: Date;
  address: string;
  emergencyName: string;
  emergencyPhone: string;
  status: string;
  remoteClock: boolean;
  salary: number;
  unread: number;
  attendanceEnabled: boolean;
};

export const getSessionUser = cache(async function getSessionUser() {
  const session = await getSessionClaims();
  if (!session) return null;
  const rows = await prisma.$queryRaw<SessionRow[]>`
    SELECT
      u.id,
      u.email,
      u.role,
      u."employeeCode",
      u."firstName",
      u."lastName",
      u.phone,
      u.department,
      u."jobTitle",
      u."hireDate",
      u.address,
      u."emergencyName",
      u."emergencyPhone",
      u.status,
      u."remoteClock",
      u.salary,
      COALESCE(o."attendanceEnabled", true) AS "attendanceEnabled",
      (
        SELECT COUNT(*)::int
        FROM "Notification" n
        WHERE n."userId" = u.id
          AND n.read = false
          AND (
            u.role IN ('ADMIN', 'MANAGER', 'ACCOUNTANT')
            OR COALESCE(o."attendanceEnabled", true)
            OR n.kind <> 'attendance'
          )
      ) AS unread
    FROM "User" u
    LEFT JOIN "OrgSetting" o ON o.id = 'default'
    WHERE u.id = ${session.sub}
    LIMIT 1
  `;
  const user = rows[0];
  if (!user || user.status !== "Active" || user.role !== session.role) return null;
  return { ...user, unread: Number(user.unread), salary: Number(user.salary) };
});

export async function requireUser(role?: SessionRole) {
  const user = await getSessionUser();
  if (!user) redirect("/logout");
  if (role && user.role !== role) {
    redirect(homeFor(user.role as SessionRole));
  }
  return user;
}

export function requireSelf() {
  return requireRoles(["EMPLOYEE", "MANAGER", "ACCOUNTANT"]);
}

export async function requireRoles(roles: SessionRole[]) {
  const user = await requireUser();
  if (!roles.includes(user.role as SessionRole)) {
    redirect(homeFor(user.role as SessionRole));
  }
  return user;
}

export function shellUser(user: {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  department: string;
  employeeCode: string;
}) {
  return {
    id: user.id,
    email: user.email,
    role: user.role as SessionRole,
    name: `${user.firstName} ${user.lastName}`,
    title: user.jobTitle,
    department: user.department,
    code: user.employeeCode,
    firstName: user.firstName,
  };
}
