import { AppShell } from "@/components/app-shell";
import { requireUser, shellUser } from "@/lib/auth";

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("MANAGER");
  return (
    <AppShell user={shellUser(user)} unread={user.unread} showAttendance={user.attendanceEnabled}>
      {children}
    </AppShell>
  );
}
