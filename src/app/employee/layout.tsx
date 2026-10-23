import { AppShell } from "@/components/app-shell";
import { requireSelf, shellUser } from "@/lib/auth";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSelf();
  return (
    <AppShell user={shellUser(user)} unread={user.unread} showAttendance={user.attendanceEnabled}>
      {children}
    </AppShell>
  );
}
