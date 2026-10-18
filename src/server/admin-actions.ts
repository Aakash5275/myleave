"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import {
  ATTENDANCE_STATUSES,
  DEPARTMENTS,
  EMPLOYEE_STATUSES,
  REQUEST_STATUSES,
  isOneOf,
} from "@/lib/constants";
import { MAX_RADIUS_M, MIN_RADIUS_M, ORG_SETTING_ID, parseCoordinate, WORKPLACE_ID } from "@/lib/geo";
import { formatDate, formatMonth, fullName, isWeekday, parseKey } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  cleanDate,
  cleanEmail,
  cleanMultiline,
  cleanName,
  cleanPhone,
  cleanText,
  isTime,
  parseAmount,
  validPassword,
} from "@/lib/validate";
import { ensureBalances, leaveAccepted, syncLeaveAcceptance } from "@/server/leave";
import { notify, refresh, reviewMessage } from "@/server/notify";
import { notifyLeaveApproved } from "@/server/slack";

function duplicateMessage(error: unknown, fallback: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "That email, employee ID, or payslip period already exists.";
  }
  console.error(error);
  return fallback;
}

export async function createEmployee(formData: FormData) {
  await requireUser("ADMIN");
  const firstName = cleanName(formData.get("firstName"));
  const lastName = cleanName(formData.get("lastName"));
  const email = cleanEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const department = cleanText(formData.get("department"), 40);
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
  if (!isOneOf(department, DEPARTMENTS)) return { error: "Choose a department." };
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
      message: "Your HR profile is ready. Sign in with the password shared by your admin.",
      kind: "account",
      href: "/employee/profile",
    });
  } catch (error) {
    return { error: duplicateMessage(error, "Could not create the employee.") };
  }

  refresh();
  return {};
}

export async function updateEmployee(formData: FormData) {
  await requireUser("ADMIN");
  const id = cleanText(formData.get("id"), 40);
  const firstName = cleanName(formData.get("firstName"));
  const lastName = cleanName(formData.get("lastName"));
  const email = cleanEmail(formData.get("email"));
  const department = cleanText(formData.get("department"), 40);
  const jobTitle = cleanText(formData.get("jobTitle"), 80);
  const hireDate = cleanDate(formData.get("hireDate"));
  const phone = cleanPhone(formData.get("phone"));
  const address = cleanMultiline(formData.get("address"), 240);
  const emergencyName = cleanText(formData.get("emergencyName"), 80);
  const emergencyPhone = cleanPhone(formData.get("emergencyPhone"));
  const status = cleanText(formData.get("status"), 20);
  const remoteClock = formData.get("remoteClock") === "on";
  const salary = parseAmount(formData.get("salary"));
  const employee = await prisma.user.findFirst({ where: { id, role: "EMPLOYEE" } });
  if (!employee) return { error: "Employee not found." };
  if (
    !firstName ||
    !lastName ||
    !email ||
    !hireDate ||
    phone === null ||
    emergencyPhone === null ||
    salary === null ||
    !isOneOf(department, DEPARTMENTS) ||
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
        salary,
      },
    });
  } catch (error) {
    return { error: duplicateMessage(error, "Could not update the employee.") };
  }

  refresh();
  return {};
}

export async function resetEmployeePassword(formData: FormData) {
  await requireUser("ADMIN");
  const id = cleanText(formData.get("id"), 40);
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const employee = await prisma.user.findFirst({ where: { id, role: "EMPLOYEE" } });
  if (!employee) return { error: "Employee not found." };
  if (!validPassword(password)) {
    return { error: "Use 8–72 characters with at least one letter and one number." };
  }
  if (password !== confirm) return { error: "The passwords do not match." };
  await prisma.user.update({
    where: { id },
    data: { passwordHash: await bcrypt.hash(password, 12) },
  });
  await notify(employee.id, {
    title: "Password reset",
    message: "An admin reset your password. Use the new temporary password to sign in.",
    kind: "account",
    href: "/employee/profile",
  });
  refresh();
  return {};
}

export async function setClockAnywhere(enabled: boolean) {
  await requireUser("ADMIN");
  if (typeof enabled !== "boolean") return { error: "Choose on or off." };
  await prisma.orgSetting.upsert({
    where: { id: ORG_SETTING_ID },
    create: { id: ORG_SETTING_ID, clockAnywhere: enabled },
    update: { clockAnywhere: enabled },
  });
  refresh();
  return {};
}

export async function setAttendanceEnabled(enabled: boolean) {
  await requireUser("ADMIN");
  if (typeof enabled !== "boolean") return { error: "Choose on or off." };
  await prisma.orgSetting.upsert({
    where: { id: ORG_SETTING_ID },
    create: { id: ORG_SETTING_ID, attendanceEnabled: enabled },
    update: { attendanceEnabled: enabled },
  });
  refresh();
  return {};
}

export async function saveWorkplace(formData: FormData) {
  await requireUser("ADMIN");
  const name = cleanText(formData.get("name"), 80);
  const latitude = parseCoordinate(formData.get("latitude"), -90, 90);
  const longitude = parseCoordinate(formData.get("longitude"), -180, 180);
  const radiusM = Number(String(formData.get("radiusM") ?? "").trim());
  if (name.length < 2) return { error: "Name the office." };
  if (latitude === null || longitude === null) return { error: "Enter a valid latitude and longitude." };
  if (!Number.isInteger(radiusM) || radiusM < MIN_RADIUS_M || radiusM > MAX_RADIUS_M) {
    return { error: `Radius must be a whole number from ${MIN_RADIUS_M} to ${MAX_RADIUS_M} metres.` };
  }

  await prisma.workplace.upsert({
    where: { id: WORKPLACE_ID },
    create: { id: WORKPLACE_ID, name, latitude, longitude, radiusM },
    update: { name, latitude, longitude, radiusM },
  });
  refresh();
  return {};
}

export async function updateAttendance(formData: FormData) {
  const admin = await requireUser("ADMIN");
  const userId = cleanText(formData.get("userId"), 40);
  const date = cleanDate(formData.get("date"));
  const status = cleanText(formData.get("status"), 20);
  const checkIn = cleanText(formData.get("checkIn"), 5);
  const checkOut = cleanText(formData.get("checkOut"), 5);
  const notes = cleanMultiline(formData.get("notes"), 300);
  if (!date || !isOneOf(status, ATTENDANCE_STATUSES)) {
    return { error: "Choose a valid date and status." };
  }
  if ((checkIn && !isTime(checkIn)) || (checkOut && !isTime(checkOut))) {
    return { error: "Times must use HH:MM." };
  }
  if (checkIn && checkOut && checkOut < checkIn) {
    return { error: "Check-out must be after check-in." };
  }
  const employee = await prisma.user.findFirst({ where: { id: userId, role: "EMPLOYEE" } });
  if (!employee) return { error: "Employee not found." };

  await prisma.attendance.upsert({
    where: { userId_date: { userId, date: parseKey(date) } },
    create: {
      userId,
      date: parseKey(date),
      status,
      checkIn: checkIn || null,
      checkOut: checkOut || null,
      notes,
    },
    update: {
      status,
      checkIn: checkIn || null,
      checkOut: checkOut || null,
      notes,
    },
  });
  await notify(employee.id, {
    title: "Attendance updated",
    message: `${fullName(admin)} marked ${formatDate(parseKey(date))} as ${status}.`,
    kind: "attendance",
    href: "/employee/attendance",
  });
  refresh();
  return {};
}

export async function markMissingAbsent(dateKey: string) {
  await requireUser("ADMIN");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !isWeekday(dateKey)) {
    return { error: "Choose a weekday to mark absences." };
  }
  const date = parseKey(dateKey);
  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE", status: "Active" },
    select: { id: true },
  });
  const existing = await prisma.attendance.findMany({ where: { date }, select: { userId: true } });
  const marked = new Set(existing.map((row) => row.userId));
  const missing = employees.filter((employee) => !marked.has(employee.id));
  if (!missing.length) return { count: 0 };

  await prisma.attendance.createMany({
    data: missing.map((employee) => ({
      userId: employee.id,
      date,
      status: "Absent",
      notes: "Marked absent by HR",
    })),
  });
  await prisma.notification.createMany({
    data: missing.map((employee) => ({
      userId: employee.id,
      title: "Marked absent",
      message: `HR marked you absent on ${formatDate(date)}.`,
      kind: "attendance",
      href: "/employee/attendance",
    })),
  });
  refresh();
  return { count: missing.length };
}

export async function reviewLeave(formData: FormData) {
  const admin = await requireUser("ADMIN");
  const id = cleanText(formData.get("id"), 40);
  const status = cleanText(formData.get("status"), 20);
  const note = cleanMultiline(formData.get("note"), 500);
  if (!isOneOf(status, REQUEST_STATUSES)) return { error: "Choose a valid status." };
  if (status === "Rejected" && note.length < 3) {
    return { error: "Add a note explaining the rejection." };
  }
  const leave = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!leave) return { error: "Leave request not found." };
  if (leave.status === status && leave.adminNote === note) {
    return { error: "Nothing changed." };
  }

  const balanceError = await syncLeaveAcceptance(leave, status);
  if (balanceError) return { error: balanceError };

  await prisma.leaveRequest.update({
    where: { id },
    data: { status, adminNote: note, reviewerId: admin.id, reviewedAt: new Date() },
  });
  await notify(leave.userId, {
    title: "Leave request updated",
    message: reviewMessage(status, fullName(admin), note),
    kind: "leave",
    href: "/employee/leave",
  });
  if (leaveAccepted(status) && !leaveAccepted(leave.status)) {
    await notifyLeaveApproved({
      name: fullName(leave.user),
      type: leave.type,
      start: leave.startDate,
      end: leave.endDate,
      days: leave.days,
      automatic: false,
      reviewer: fullName(admin),
    });
  }
  refresh();
  return {};
}

export async function reviewHr(formData: FormData) {
  const admin = await requireUser("ADMIN");
  const id = cleanText(formData.get("id"), 40);
  const status = cleanText(formData.get("status"), 20);
  const note = cleanMultiline(formData.get("note"), 500);
  if (!isOneOf(status, REQUEST_STATUSES)) return { error: "Choose a valid status." };
  if (status === "Rejected" && note.length < 3) {
    return { error: "Add a note explaining the rejection." };
  }
  const request = await prisma.hrRequest.findUnique({ where: { id } });
  if (!request) return { error: "Request not found." };
  await prisma.hrRequest.update({
    where: { id },
    data: { status, adminNote: note, reviewerId: admin.id, reviewedAt: new Date() },
  });
  await notify(request.userId, {
    title: "HR request updated",
    message: reviewMessage(status, fullName(admin), note),
    kind: "hr",
    href: "/employee/requests",
  });
  refresh();
  return {};
}

export async function reviewDocument(formData: FormData) {
  const admin = await requireUser("ADMIN");
  const id = cleanText(formData.get("id"), 40);
  const status = cleanText(formData.get("status"), 20);
  const note = cleanMultiline(formData.get("note"), 500);
  if (!isOneOf(status, REQUEST_STATUSES)) return { error: "Choose a valid status." };
  if (status === "Rejected" && note.length < 3) {
    return { error: "Add a note explaining the rejection." };
  }
  const request = await prisma.documentRequest.findUnique({ where: { id } });
  if (!request) return { error: "Document request not found." };
  await prisma.documentRequest.update({
    where: { id },
    data: { status, adminNote: note, reviewerId: admin.id, reviewedAt: new Date() },
  });
  await notify(request.userId, {
    title: "Document request updated",
    message: reviewMessage(status, fullName(admin), note),
    kind: "document",
    href: "/employee/documents",
  });
  refresh();
  return {};
}

export async function savePayslip(formData: FormData) {
  await requireUser("ADMIN");
  const id = cleanText(formData.get("id"), 40);
  const userId = cleanText(formData.get("userId"), 40);
  const month = Number(formData.get("month"));
  const year = Number(formData.get("year"));
  const basic = parseAmount(formData.get("basic"));
  const allowances = parseAmount(formData.get("allowances"));
  const overtime = parseAmount(formData.get("overtime"));
  const deductions = parseAmount(formData.get("deductions"));
  const tax = parseAmount(formData.get("tax"));
  const notes = cleanMultiline(formData.get("notes"), 400);
  const intent = cleanText(formData.get("intent"), 20);
  if (
    basic === null ||
    allowances === null ||
    overtime === null ||
    deductions === null ||
    tax === null ||
    month < 1 ||
    month > 12 ||
    year < 2000 ||
    year > 2100
  ) {
    return { error: "Enter a valid period and non-negative amounts." };
  }
  const netPay = basic + allowances + overtime - deductions - tax;
  if (netPay < 0) return { error: "Net pay cannot be negative. Check deductions and tax." };
  const employee = await prisma.user.findFirst({ where: { id: userId, role: "EMPLOYEE" } });
  if (!employee) return { error: "Choose an employee." };

  const status = intent === "draft" ? "Draft" : "Issued";
  const data = {
    userId,
    month,
    year,
    basic,
    allowances,
    overtime,
    deductions,
    tax,
    netPay,
    notes,
    status,
    issuedAt: status === "Issued" ? new Date() : null,
  };

  try {
    if (id) {
      const existing = await prisma.payslip.findUnique({ where: { id } });
      if (!existing) return { error: "Payslip not found." };
      await prisma.payslip.update({ where: { id }, data });
      if (status === "Issued" && existing.status !== "Issued") {
        await notify(userId, {
          title: "Payslip available",
          message: `Your payslip for ${formatMonth(year, month)} is ready.`,
          kind: "payroll",
          href: "/employee/payroll",
        });
      }
    } else {
      await prisma.payslip.create({ data });
      if (status === "Issued") {
        await notify(userId, {
          title: "Payslip available",
          message: `Your payslip for ${formatMonth(year, month)} is ready.`,
          kind: "payroll",
          href: "/employee/payroll",
        });
      }
    }
  } catch (error) {
    return { error: duplicateMessage(error, "Could not save the payslip.") };
  }

  refresh();
  return {};
}

export async function saveAnnouncement(formData: FormData) {
  const admin = await requireUser("ADMIN");
  const title = cleanText(formData.get("title"), 120);
  const body = cleanMultiline(formData.get("body"), 2000);
  const pinned = formData.get("pinned") === "on";
  if (title.length < 4 || body.length < 10) {
    return { error: "Add a title and a message employees can act on." };
  }
  await prisma.announcement.create({
    data: { title, body, pinned, authorId: admin.id },
  });
  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE", status: "Active" },
    select: { id: true },
  });
  if (employees.length) {
    await prisma.notification.createMany({
      data: employees.map((employee) => ({
        userId: employee.id,
        title: "New announcement",
        message: title,
        kind: "announcement",
        href: "/employee",
      })),
    });
  }
  refresh();
  return {};
}

export async function deleteAnnouncement(formData: FormData) {
  await requireUser("ADMIN");
  const id = cleanText(formData.get("id"), 40);
  await prisma.announcement.deleteMany({ where: { id } });
  refresh();
  return {};
}

export async function toggleAnnouncementPin(formData: FormData) {
  await requireUser("ADMIN");
  const id = cleanText(formData.get("id"), 40);
  const pinned = formData.get("pinned") === "true";
  await prisma.announcement.update({ where: { id }, data: { pinned: !pinned } });
  refresh();
  return {};
}
