import { ORG_SETTING_ID } from "@/lib/geo";
import { formatDate, fullName, parseKey, todayKey } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { leaveAccepted, syncLeaveAcceptance } from "@/server/leave";
import { notify } from "@/server/notify";
import { notifyLeaveApproved, notifyOnLeaveToday } from "@/server/slack";

export async function runLeaveDay() {
  const today = todayKey();
  const todayDate = parseKey(today);

  await prisma.orgSetting.upsert({
    where: { id: ORG_SETTING_ID },
    create: { id: ORG_SETTING_ID, clockAnywhere: false, lastLeaveDigest: "" },
    update: {},
  });

  const waiting = await prisma.leaveRequest.findMany({
    where: {
      status: { in: ["Pending", "In Progress"] },
      startDate: { lte: todayDate },
    },
    include: { user: true },
    orderBy: { startDate: "asc" },
  });

  let autoApproved = 0;
  for (const leave of waiting) {
    const taken = await prisma.leaveRequest.updateMany({
      where: { id: leave.id, status: { in: ["Pending", "In Progress"] } },
      data: {
        status: "Approved",
        adminNote: "Approved automatically because no one replied before the start date.",
        reviewedAt: new Date(),
      },
    });
    if (taken.count === 0) continue;
    const balanceError = await syncLeaveAcceptance(leave, "Approved");
    if (balanceError) {
      await prisma.leaveRequest.update({
        where: { id: leave.id },
        data: { status: leave.status, adminNote: "", reviewedAt: null },
      });
      continue;
    }
    await notify(leave.userId, {
      title: "Leave approved automatically",
      message: `Your ${leave.type.toLowerCase()} leave starting ${formatDate(leave.startDate)} was approved because it was still waiting on the start date.`,
      kind: "leave",
      href: "/employee/leave",
    });
    await notifyLeaveApproved({
      name: fullName(leave.user),
      type: leave.type,
      start: leave.startDate,
      end: leave.endDate,
      days: leave.days,
      automatic: true,
    });
    autoApproved += 1;
  }

  const claimed = await prisma.orgSetting.updateMany({
    where: { id: ORG_SETTING_ID, lastLeaveDigest: { not: today } },
    data: { lastLeaveDigest: today },
  });
  if (claimed.count === 0) return { autoApproved, digest: "already-sent" as const };

  const away = await prisma.leaveRequest.findMany({
    where: {
      status: { in: ["Approved", "Resolved"] },
      startDate: { lte: todayDate },
      endDate: { gte: todayDate },
    },
    include: { user: { select: { firstName: true, lastName: true } } },
    orderBy: { user: { firstName: "asc" } },
  });
  await notifyOnLeaveToday({
    dateLabel: formatDate(todayDate),
    people: away.filter((leave) => leaveAccepted(leave.status)).map((leave) => ({
      name: fullName(leave.user),
      type: leave.type,
      end: leave.endDate,
    })),
  });
  return { autoApproved, digest: away.length ? "sent" as const : "empty" as const };
}
