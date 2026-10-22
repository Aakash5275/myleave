"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COOKIE, cookieOptions, homeFor, signSession, type SessionRole } from "@/lib/session";
import { cleanEmail } from "@/lib/validate";

export type ActionState = { error?: string } | null;

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = cleanEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Invalid email or password." };

  const user = await prisma.user.findUnique({ where: { email } });
  const valid =
    user &&
    user.status === "Active" &&
    (await bcrypt.compare(password, user.passwordHash));
  if (!user || !valid) return { error: "Invalid email or password." };

  const role: SessionRole = user.role === "ADMIN" || user.role === "MANAGER" ? user.role : "EMPLOYEE";
  const token = await signSession({
    id: user.id,
    role,
    email: user.email,
  });
  const jar = await cookies();
  jar.set(COOKIE, token, cookieOptions());
  redirect(homeFor(role));
}

export async function logout() {
  const jar = await cookies();
  jar.set(COOKIE, "", cookieOptions(0));
  redirect("/");
}
