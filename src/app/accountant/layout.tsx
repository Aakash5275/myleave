import { AppShell } from "@/components/app-shell";
import { requireUser, shellUser } from "@/lib/auth";

export default async function AccountantLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("ACCOUNTANT");
  return (
    <AppShell user={shellUser(user)} unread={user.unread}>
      {children}
    </AppShell>
  );
}
