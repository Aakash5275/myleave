import { AppShell } from "@/components/app-shell";
import { requireUser, shellUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("EMPLOYEE");
  const unread = await prisma.notification.count({
    where: { userId: user.id, read: false },
  });
  return (
    <AppShell user={shellUser(user)} unread={unread}>
      {children}
    </AppShell>
  );
}
