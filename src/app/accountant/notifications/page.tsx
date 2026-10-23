import { NotificationsView } from "@/components/notifications-view";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Notifications" };

export default async function AccountantNotificationsPage() {
  const user = await requireUser("ACCOUNTANT");
  const items = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader eyebrow="Inbox" title="Notifications" description="Account updates for this login appear here." />
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
