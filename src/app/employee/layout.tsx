import { AppShell } from "@/components/app-shell";
import { requireUser, shellUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { attendanceEnabled } from "@/server/settings";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("EMPLOYEE");
  const showAttendance = await attendanceEnabled();
  const unread = await prisma.notification.count({
    where: {
      userId: user.id,
      read: false,
      ...(showAttendance ? {} : { kind: { not: "attendance" } }),
    },
  });
  return (
    <AppShell user={shellUser(user)} unread={unread} showAttendance={showAttendance}>
      {children}
    </AppShell>
  );
}
