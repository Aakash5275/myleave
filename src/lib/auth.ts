import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COOKIE, readSession, type SessionRole } from "@/lib/session";

export async function getSessionUser() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const session = await readSession(token);
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user || user.status !== "Active" || user.role !== session.role) return null;
  return user;
}

export async function requireUser(role?: SessionRole) {
  const user = await getSessionUser();
  if (!user) redirect("/logout");
  if (role && user.role !== role) {
    redirect(user.role === "ADMIN" ? "/admin" : "/employee");
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
