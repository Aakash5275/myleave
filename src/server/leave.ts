import { LEAVE_ALLOWANCE } from "@/lib/constants";
import { dateKey, eachDate, isWeekday, parseKey, yearOf } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export async function ensureBalances(userId: string, year = yearOf()) {
  for (const [type, total] of Object.entries(LEAVE_ALLOWANCE)) {
    await prisma.leaveBalance.upsert({
      where: { userId_type_year: { userId, type, year } },
      update: {},
      create: { userId, type, total, used: 0, year },
    });
  }
}

const accepted = new Set(["Approved", "Resolved"]);

export function leaveAccepted(status: string) {
  return accepted.has(status);
}

export async function availableDays(
  userId: string,
  type: string,
  year: number,
  excludeId?: string,
) {
  if (type === "Unpaid") return Number.POSITIVE_INFINITY;
  const balance = await prisma.leaveBalance.findUnique({
    where: { userId_type_year: { userId, type, year } },
  });
  if (!balance) return 0;
  const pending = await prisma.leaveRequest.aggregate({
    where: {
      userId,
      type,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      status: { in: ["Pending", "In Progress"] },
      startDate: { gte: parseKey(`${year}-01-01`), lte: parseKey(`${year}-12-31`) },
    },
    _sum: { days: true },
  });
  return balance.total - balance.used - (pending._sum.days ?? 0);
}

async function markLeaveAttendance(userId: string, start: Date, end: Date) {
  for (const key of eachDate(dateKey(start), dateKey(end))) {
    if (!isWeekday(key)) continue;
    const date = parseKey(key);
    const existing = await prisma.attendance.findUnique({
      where: { userId_date: { userId, date } },
    });
    if (!existing) {
      await prisma.attendance.create({
        data: { userId, date, status: "On Leave", notes: "Approved leave" },
      });
    } else if (!existing.checkIn) {
      await prisma.attendance.update({
        where: { id: existing.id },
        data: { status: "On Leave", notes: "Approved leave" },
      });
    }
  }
}

export async function syncLeaveAcceptance(
  leave: {
    id: string;
    userId: string;
    type: string;
    days: number;
    startDate: Date;
    endDate: Date;
    status: string;
  },
  nextStatus: string,
) {
  const wasAccepted = leaveAccepted(leave.status);
  const nowAccepted = leaveAccepted(nextStatus);
  const year = leave.startDate.getUTCFullYear();

  if (!wasAccepted && nowAccepted) {
    await ensureBalances(leave.userId, year);
    if (leave.type !== "Unpaid") {
      const left = await availableDays(leave.userId, leave.type, year, leave.id);
      if (left < leave.days) {
        return `Not enough ${leave.type.toLowerCase()} leave. ${Math.max(0, left)} day(s) available.`;
      }
    }
    await prisma.leaveBalance.update({
      where: { userId_type_year: { userId: leave.userId, type: leave.type, year } },
      data: { used: { increment: leave.days } },
    });
    await markLeaveAttendance(leave.userId, leave.startDate, leave.endDate);
  }

  if (wasAccepted && !nowAccepted) {
    await ensureBalances(leave.userId, year);
    const balance = await prisma.leaveBalance.findUnique({
      where: { userId_type_year: { userId: leave.userId, type: leave.type, year } },
    });
    if (balance) {
      await prisma.leaveBalance.update({
        where: { userId_type_year: { userId: leave.userId, type: leave.type, year } },
        data: { used: Math.max(0, balance.used - leave.days) },
      });
    }
    await prisma.attendance.deleteMany({
      where: {
        userId: leave.userId,
        status: "On Leave",
        checkIn: null,
        date: { gte: leave.startDate, lte: leave.endDate },
        notes: "Approved leave",
      },
    });
  }

  return null;
}
