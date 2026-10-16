import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export function refresh() {
  revalidatePath("/", "layout");
}

export async function notify(
  userId: string,
  input: { title: string; message: string; kind: string; href: string },
) {
  await prisma.notification.create({ data: { userId, ...input } });
}

export async function notifyAdmins(input: {
  title: string;
  message: string;
  kind: string;
  href: string;
}) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", status: "Active" },
    select: { id: true },
  });
  if (!admins.length) return;
  await prisma.notification.createMany({
    data: admins.map((admin) => ({ userId: admin.id, ...input })),
  });
}

export function reviewMessage(status: string, reviewer: string, note: string) {
  return note
    ? `Status is now ${status}. ${reviewer}: ${note}`
    : `Status is now ${status}. Updated by ${reviewer}.`;
}
