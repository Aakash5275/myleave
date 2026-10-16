"use server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { refresh } from "@/server/notify";

export async function markNotificationRead(id: string) {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { id, userId: user.id },
    data: { read: true },
  });
  refresh();
  return {};
}

export async function markAllNotificationsRead() {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });
  refresh();
  return {};
}
