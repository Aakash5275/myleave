"use client";

import {
  BarChart3,
  Bell,
  CalendarRange,
  Clock3,
  FolderOpen,
  History,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessagesSquare,
  Receipt,
  UserRound,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentType } from "react";
import { logout } from "@/server/auth-actions";

type ShellUser = {
  name: string;
  email: string;
  role: "ADMIN" | "EMPLOYEE";
  title: string;
  department: string;
  code: string;
  firstName: string;
};

const employeeLinks = [
  { href: "/employee", label: "Dashboard", icon: LayoutDashboard },
  { href: "/employee/profile", label: "Profile", icon: UserRound },
  { href: "/employee/attendance", label: "Attendance", icon: Clock3 },
  { href: "/employee/leave", label: "Leave", icon: CalendarRange },
  { href: "/employee/payroll", label: "Payslips", icon: Receipt },
  { href: "/employee/requests", label: "HR requests", icon: MessagesSquare },
  { href: "/employee/documents", label: "Documents", icon: FolderOpen },
  { href: "/employee/history", label: "History", icon: History },
  { href: "/employee/notifications", label: "Notifications", icon: Bell },
];

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/employees", label: "Employees", icon: Users },
  { href: "/admin/attendance", label: "Attendance", icon: Clock3 },
  { href: "/admin/leave", label: "Leave", icon: CalendarRange },
  { href: "/admin/payroll", label: "Payroll", icon: Receipt },
  { href: "/admin/requests", label: "HR tickets", icon: MessagesSquare },
  { href: "/admin/documents", label: "Documents", icon: FolderOpen },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
];

function isActive(href: string, pathname: string) {
  if (href === "/employee" || href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  user,
  unread,
  showAttendance = true,
  children,
}: {
  user: ShellUser;
  unread: number;
  showAttendance?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const links = (user.role === "ADMIN" ? adminLinks : employeeLinks).filter(
    (link) => showAttendance || link.href !== "/employee/attendance",
  );

  return (
    <div className="min-h-screen bg-sand text-ink">
      {open ? (
        <button
          className="fixed inset-0 z-30 bg-ink/40 md:hidden"
          aria-label="Close menu"
          onClick={() => setOpenPath(null)}
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-panel text-white transition-transform print:hidden ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <Link href={user.role === "ADMIN" ? "/admin" : "/employee"} className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal text-sm font-bold">ML</span>
            <span>
              <span className="block text-base font-semibold">MyLeave</span>
              <span className="block text-xs text-white/60">{user.role === "ADMIN" ? "Admin" : "Employee"}</span>
            </span>
          </Link>
          <button className="rounded-lg p-2 text-white/70 md:hidden" onClick={() => setOpenPath(null)} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {links.map((link) => {
            const Icon = link.icon as ComponentType<{ size?: number }>;
            const active = isActive(link.href, pathname);
            const showBadge = link.href.endsWith("/notifications") && unread > 0;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"}`}
              >
                <Icon size={18} />
                <span className="flex-1">{link.label}</span>
                {showBadge ? (
                  <span className="rounded-full bg-teal px-2 py-0.5 text-xs text-white">{unread}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4">
          <p className="text-sm font-semibold">{user.name}</p>
          <p className="text-xs text-white/60">{user.title}</p>
          <p className="text-xs text-white/40">{user.code} · {user.department}</p>
          <form action={logout} className="mt-3">
            <button className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white" type="submit">
              <LogOut size={16} />
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="md:pl-72">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-sand/90 px-4 py-3 backdrop-blur print:hidden sm:px-6">
          <button className="rounded-xl border border-line bg-white p-2 md:hidden" onClick={() => setOpenPath(pathname)} aria-label="Open menu">
            <Menu size={18} />
          </button>
          <p className="text-sm text-mist">Hello, {user.firstName}</p>
          <Link
            href={user.role === "ADMIN" ? "/admin/notifications" : "/employee/notifications"}
            className="relative ml-auto rounded-xl border border-line bg-white p-2"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unread > 0 ? (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-teal px-1 text-[10px] font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            ) : null}
          </Link>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
