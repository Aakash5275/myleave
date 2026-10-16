"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { btnSecondary } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { markAllNotificationsRead, markNotificationRead } from "@/server/notification-actions";

export function NotificationsView({
  items,
}: {
  items: Array<{
    id: string;
    title: string;
    message: string;
    href: string;
    read: boolean;
    kind: string;
    createdAt: string;
  }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-white px-4 py-10 text-center">
        <p className="font-medium">You are all caught up</p>
        <p className="mt-1 text-sm text-mist">Status changes, payslips, and announcements show up here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          className={btnSecondary}
          type="button"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              await markAllNotificationsRead();
              router.refresh();
            });
          }}
        >
          Mark all read
        </button>
      </div>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={`w-full rounded-2xl border px-4 py-4 text-left shadow-sm ${item.read ? "border-line bg-white" : "border-teal/30 bg-white"}`}
              onClick={() => {
                startTransition(async () => {
                  await markNotificationRead(item.id);
                  if (item.href) router.push(item.href);
                  else router.refresh();
                });
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{item.title}</p>
                <span className="text-xs text-mist">{formatDateTime(item.createdAt)}</span>
              </div>
              <p className="mt-1 text-sm text-mist">{item.message}</p>
              <p className="mt-2 text-xs uppercase tracking-wide text-teal">{item.kind}</p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
