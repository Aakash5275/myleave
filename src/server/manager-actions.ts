"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { EMPLOYEE_STATUSES, isOneOf } from "@/lib/constants";
import { parseKey } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { ensureBalances } from "@/server/leave";
import { notify, refresh } from "@/server/notify";
import {
  cleanDate,
  cleanDepartment,
  cleanEmail,
  cleanMultiline,
  cleanName,
  cleanPhone,
  cleanText,
  validPassword,
} from "@/lib/validate";

function duplicateMessage(error: unknown, fallback: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "That email is already in use.";
  }
  return fallback;
}

export async function createTeamMember(formData: FormData) {
  const manager = await requireUser("MANAGER");
  const firstName = cleanName(formData.get("firstName"));
  const lastName = cleanName(formData.get("lastName"));
  const email = cleanEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const department = cleanDepartment(formData.get("department"), formData.get("customDepartment"));
  const jobTitle = cleanText(formData.get("jobTitle"), 80);
  const hireDate = cleanDate(formData.get("hireDate"));
  const phone = cleanPhone(formData.get("phone"));
  const salary = parseAmount(formData.get("salary"));
  if (!firstName || !lastName || !email || !hireDate || phone === null || salary === null) {
    return { error: "Check the name, email, hire date, phone, and salary." };
  }
  if (!validPassword(password)) {
    return { error: "Set a temporary password with 8–72 characters, a letter, and a number." };
  }
  if (!department) return { error: "Choose a department, or type one." };
  if (jobTitle.length < 2) return { error: "Add a job title." };

  const codes = await prisma.user.findMany({ select: { employeeCode: true } });
  const nextNumber =
    codes.reduce((max, row) => {
      const value = Number(row.employeeCode.replace(/\D/g, ""));
      return Number.isFinite(value) ? Math.max(max, value) : max;
    }, 1000) + 1;

  try {
    const employee = await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(password, 12),
        role: "EMPLOYEE",
        managerId: manager.id,
        employeeCode: `ML-${nextNumber}`,
        firstName,
        lastName,
        phone,
        department,
        jobTitle,
        hireDate: parseKey(hireDate),
        salary,
      },
    });
    await ensureBalances(employee.id);
    await notify(employee.id, {
      title: "Welcome to MyLeave",
      message: `${manager.firstName} ${manager.lastName} created your account. Sign in with the password they shared.`,
      kind: "account",
      href: "/employee/profile",
    });
  } catch (error) {
    return { error: duplicateMessage(error, "Could not create the employee.") };
  }

  refresh();
  return {};
}

function parseAmount(value: FormDataEntryValue | null) {
  const amount = Number(value);
  if (!Number.isInteger(amount) || amount < 0 || amount > 100000000) return null;
  return amount;
}

export async function updateTeamMember(formData: FormData) {
  const manager = await requireUser("MANAGER");
  const id = cleanText(formData.get("id"), 40);
  const firstName = cleanName(formData.get("firstName"));
  const lastName = cleanName(formData.get("lastName"));
  const email = cleanEmail(formData.get("email"));
  const department = cleanDepartment(formData.get("department"), formData.get("customDepartment"));
  const jobTitle = cleanText(formData.get("jobTitle"), 80);
  const hireDate = cleanDate(formData.get("hireDate"));
  const phone = cleanPhone(formData.get("phone"));
  const address = cleanMultiline(formData.get("address"), 240);
  const emergencyName = cleanText(formData.get("emergencyName"), 80);
  const emergencyPhone = cleanPhone(formData.get("emergencyPhone"));
  const status = cleanText(formData.get("status"), 20);
  const remoteClock = formData.get("remoteClock") === "on";
  const employee = await prisma.user.findFirst({
    where: { id, role: "EMPLOYEE", managerId: manager.id },
  });
  if (!employee) return { error: "This person is not on your team." };
  if (!department) return { error: "Choose a department, or type one." };
  if (
    !firstName ||
    !lastName ||
    !email ||
    !hireDate ||
    phone === null ||
    emergencyPhone === null ||
    !isOneOf(status, EMPLOYEE_STATUSES)
  ) {
    return { error: "Check the employee details and try again." };
  }
  if (jobTitle.length < 2) return { error: "Add a job title." };
  if (emergencyName && !cleanName(emergencyName)) {
    return { error: "Enter a valid emergency contact name." };
  }

  try {
    await prisma.user.update({
      where: { id },
      data: {
        firstName,
        lastName,
        email,
        department,
        jobTitle,
        hireDate: parseKey(hireDate),
        phone,
        address,
        emergencyName,
        emergencyPhone,
        status,
        remoteClock,
      },
    });
  } catch (error) {
    return { error: duplicateMessage(error, "Could not update the employee.") };
  }

  refresh();
  return {};
}

export async function approveAttendance(userId: string, day: string) {
  const manager = await requireUser("MANAGER");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return { error: "Choose a valid date." };
  const employee = await prisma.user.findFirst({
    where: { id: userId, role: "EMPLOYEE", managerId: manager.id },
    select: { id: true },
  });
  if (!employee) return { error: "This person is not on your team." };
  const record = await prisma.attendance.findUnique({
    where: { userId_date: { userId, date: parseKey(day) } },
  });
  if (!record) return { error: "There is no attendance record to approve yet." };
  if (!record.approvedAt) {
    await prisma.attendance.update({
      where: { id: record.id },
      data: { approvedAt: new Date(), approvedById: manager.id },
    });
    await notify(employee.id, {
      title: "Attendance approved",
      message: `${manager.firstName} ${manager.lastName} approved your attendance for ${day}.`,
      kind: "attendance",
      href: "/employee/attendance",
    });
  }
  refresh();
  return {};
}
