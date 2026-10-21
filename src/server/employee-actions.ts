"use server";

import bcrypt from "bcryptjs";
import { requireUser } from "@/lib/auth";
import {
  DOC_TYPES,
  HR_CATEGORIES,
  LEAVE_TYPES,
  PRIORITIES,
  isOneOf,
} from "@/lib/constants";
import { addDays, nowTime, parseKey, todayKey, workingDays } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  cleanDate,
  cleanMultiline,
  cleanName,
  cleanPhone,
  cleanText,
  validPassword,
} from "@/lib/validate";
import { distanceMeters, ORG_SETTING_ID, parseGps, WORKPLACE_ID } from "@/lib/geo";
import { availableDays, ensureBalances, syncLeaveAcceptance } from "@/server/leave";
import { notifyAdmins, refresh } from "@/server/notify";
import { notifyLeaveRequested } from "@/server/slack";

async function requireAtWorkplace(location: unknown, remoteClock: boolean) {
  const fix = parseGps(location);
  if (!fix) return { error: "A GPS location is required to check in or out." };
  if (remoteClock) return { fix };
  const workplace = await prisma.workplace.findUnique({ where: { id: WORKPLACE_ID } });
  if (!workplace) return { error: "HR has not set the office location yet." };
  if (fix.accuracy > workplace.radiusM) {
    return {
      error: `GPS is only accurate to ${Math.round(fix.accuracy)} m. Wait outdoors until it is within ${workplace.radiusM} m, then try again.`,
    };
  }
  const distance = distanceMeters(fix.latitude, fix.longitude, workplace.latitude, workplace.longitude);
  if (distance > workplace.radiusM) {
    return {
      error: `You are about ${Math.round(distance)} m from ${workplace.name}. You need to be within ${workplace.radiusM} m.`,
    };
  }
  return { fix };
}

export async function clock(kind: "in" | "out", location: unknown) {
  const user = await requireUser("EMPLOYEE");
  const policy = await prisma.orgSetting.findUnique({ where: { id: ORG_SETTING_ID } });
  if (policy?.attendanceEnabled === false) return { error: "Attendance is turned off." };
  const gate = await requireAtWorkplace(location, user.remoteClock || Boolean(policy?.clockAnywhere));
  if ("error" in gate) return { error: gate.error };
  const key = todayKey();
  const date = parseKey(key);
  const existing = await prisma.attendance.findUnique({
    where: { userId_date: { userId: user.id, date } },
  });
  const time = nowTime();
  const fix = gate.fix;

  if (kind === "in") {
    if (existing?.checkIn) return { error: "You have already checked in today." };
    const status = time > "09:30" ? "Late" : "Present";
    await prisma.attendance.upsert({
      where: { userId_date: { userId: user.id, date } },
      create: {
        userId: user.id,
        date,
        checkIn: time,
        status,
        checkInLat: fix.latitude,
        checkInLng: fix.longitude,
        checkInAccuracy: fix.accuracy,
      },
      update: {
        checkIn: time,
        status,
        notes: existing?.notes === "Approved leave" ? "Worked during approved leave" : existing?.notes ?? "",
        checkInLat: fix.latitude,
        checkInLng: fix.longitude,
        checkInAccuracy: fix.accuracy,
      },
    });
  } else {
    if (!existing?.checkIn) return { error: "Check in before checking out." };
    if (existing.checkOut) return { error: "You have already checked out today." };
    await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        checkOut: time,
        checkOutLat: fix.latitude,
        checkOutLng: fix.longitude,
        checkOutAccuracy: fix.accuracy,
      },
    });
  }

  refresh();
  return {};
}

export async function applyLeave(formData: FormData) {
  const user = await requireUser("EMPLOYEE");
  const type = cleanText(formData.get("type"), 20);
  const start = cleanDate(formData.get("startDate"));
  const end = cleanDate(formData.get("endDate"));
  const reason = cleanMultiline(formData.get("reason"), 1000);
  if (!isOneOf(type, LEAVE_TYPES) || !start || !end) {
    return { error: "Choose a leave type and valid dates." };
  }
  if (end < start) return { error: "The end date must be on or after the start date." };
  const today = todayKey();
  if (start < addDays(today, -30)) return { error: "The start date is too far in the past." };
  if (start > addDays(today, 365)) return { error: "The start date is too far in the future." };
  const days = workingDays(start, end);
  if (days < 1) return { error: "Select at least one working day." };
  if (days > 30) return { error: "A single request can cover up to 30 working days." };
  if (reason.length < 8) return { error: "Add a short reason (at least 8 characters)." };

  const overlap = await prisma.leaveRequest.findFirst({
    where: {
      userId: user.id,
      status: { in: ["Pending", "In Progress", "Approved", "Resolved"] },
      startDate: { lte: parseKey(end) },
      endDate: { gte: parseKey(start) },
    },
  });
  if (overlap) return { error: "Those dates overlap an existing leave request." };

  const year = Number(start.slice(0, 4));
  await ensureBalances(user.id, year);
  if (type !== "Unpaid") {
    const left = await availableDays(user.id, type, year);
    if (left < days) {
      return {
        error: `Not enough ${type.toLowerCase()} leave. ${Math.max(0, left)} day(s) available.`,
      };
    }
  }

  await prisma.leaveRequest.create({
    data: {
      userId: user.id,
      type,
      startDate: parseKey(start),
      endDate: parseKey(end),
      days,
      reason,
    },
  });
  await notifyAdmins({
    title: "New leave request",
    message: `${user.firstName} ${user.lastName} requested ${days} day(s) of ${type.toLowerCase()} leave.`,
    kind: "leave",
    href: "/admin/leave?status=Pending",
  });
  await notifyLeaveRequested({
    name: `${user.firstName} ${user.lastName}`,
    type,
    start,
    end,
    days,
    reason,
  });
  refresh();
  return {};
}

export async function cancelLeave(id: string) {
  const user = await requireUser("EMPLOYEE");
  const leave = await prisma.leaveRequest.findFirst({
    where: { id, userId: user.id },
  });
  if (!leave) return { error: "Leave request not found." };
  const claimed = await prisma.leaveRequest.updateMany({
    where: {
      id: leave.id,
      userId: user.id,
      status: { in: ["Pending", "In Progress", "Approved", "Resolved"] },
    },
    data: { status: "Cancelled" },
  });
  if (!claimed.count) return { error: "This request can no longer be withdrawn." };
  const balanceError = await syncLeaveAcceptance(leave, "Cancelled");
  if (balanceError) {
    await prisma.leaveRequest.update({
      where: { id: leave.id },
      data: { status: leave.status },
    });
    return { error: balanceError };
  }
  refresh();
  return {};
}

export async function createHrRequest(formData: FormData) {
  const user = await requireUser("EMPLOYEE");
  const category = cleanText(formData.get("category"), 40);
  const priority = cleanText(formData.get("priority"), 20);
  const subject = cleanText(formData.get("subject"), 120);
  const description = cleanMultiline(formData.get("description"), 2000);
  if (!isOneOf(category, HR_CATEGORIES) || !isOneOf(priority, PRIORITIES)) {
    return { error: "Choose a category and priority." };
  }
  if (subject.length < 4) return { error: "Add a subject of at least 4 characters." };
  if (description.length < 10) return { error: "Describe the issue in a little more detail." };

  await prisma.hrRequest.create({
    data: { userId: user.id, category, priority, subject, description },
  });
  await notifyAdmins({
    title: "New HR request",
    message: `${user.firstName} ${user.lastName} submitted “${subject}”.`,
    kind: "hr",
    href: "/admin/requests?status=Pending",
  });
  refresh();
  return {};
}

export async function createDocumentRequest(formData: FormData) {
  const user = await requireUser("EMPLOYEE");
  const docType = cleanText(formData.get("docType"), 80);
  const purpose = cleanMultiline(formData.get("purpose"), 500);
  const details = cleanMultiline(formData.get("details"), 1000);
  if (!isOneOf(docType, DOC_TYPES)) return { error: "Choose a document type." };
  if (purpose.length < 8) return { error: "Tell HR what the document is for." };

  await prisma.documentRequest.create({
    data: { userId: user.id, docType, purpose, details },
  });
  await notifyAdmins({
    title: "New document request",
    message: `${user.firstName} ${user.lastName} requested a ${docType}.`,
    kind: "document",
    href: "/admin/documents?status=Pending",
  });
  refresh();
  return {};
}

export async function updateProfile(formData: FormData) {
  const user = await requireUser("EMPLOYEE");
  const phone = cleanPhone(formData.get("phone"));
  const emergencyPhone = cleanPhone(formData.get("emergencyPhone"));
  const emergencyName = cleanText(formData.get("emergencyName"), 80);
  const address = cleanMultiline(formData.get("address"), 240);
  if (phone === null || emergencyPhone === null) {
    return { error: "Enter a valid phone number, or leave it blank." };
  }
  if (emergencyName && !cleanName(emergencyName)) {
    return { error: "Enter a valid emergency contact name." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { phone, emergencyPhone, emergencyName, address },
  });
  refresh();
  return {};
}

export async function changePassword(formData: FormData) {
  const user = await requireUser("EMPLOYEE");
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const stored = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  const matches = await bcrypt.compare(current, stored?.passwordHash ?? "");
  if (!matches) return { error: "The current password is incorrect." };
  if (!validPassword(next)) {
    return { error: "Use 8–72 characters with at least one letter and one number." };
  }
  if (next !== confirm) return { error: "The new passwords do not match." };
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(next, 12) },
  });
  refresh();
  return {};
}
