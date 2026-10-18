import { NotificationsView } from "@/components/notifications-view";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { attendanceEnabled } from "@/server/settings";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser("EMPLOYEE");
  const showAttendance = await attendanceEnabled();
  const items = await prisma.notification.findMany({
    where: {
      userId: user.id,
      ...(showAttendance ? {} : { kind: { not: "attendance" } }),
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader eyebrow="Inbox" title="Notifications" description="Leave decisions, HR updates, payslips, and announcements land here." />
      <NotificationsView
        items={items.map((item) => ({
          id: item.id,
          title: item.title,
          message: item.message,
          href: item.href,
          read: item.read,
          kind: item.kind,
          createdAt: item.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
