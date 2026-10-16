import { AnnouncementActions, AnnouncementForm } from "@/components/admin-forms";
import { PageHeader, Panel } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDateTime, fullName } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Announcements" };

export default async function AnnouncementsPage() {
  await requireUser("ADMIN");
  const announcements = await prisma.announcement.findMany({
    include: { author: true },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Company" title="Announcements" description="Publishing notifies every active employee. Pin the ones that should stay at the top of their dashboard." />
      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Panel title="New announcement">
          <AnnouncementForm />
        </Panel>
        <div className="space-y-3">
          {announcements.map((item) => (
            <article key={item.id} className="rounded-2xl border border-line bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">{item.title}</h2>
                {item.pinned ? <span className="rounded-full bg-teal/10 px-2 py-1 text-xs font-semibold text-teal">Pinned</span> : null}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-mist">{item.body}</p>
              <p className="mt-3 text-xs text-mist">{fullName(item.author)} · {formatDateTime(item.createdAt)}</p>
              <div className="mt-4">
                <AnnouncementActions id={item.id} pinned={item.pinned} />
              </div>
            </article>
          ))}
          {!announcements.length ? <p className="text-sm text-mist">No announcements yet.</p> : null}
        </div>
      </div>
    </div>
  );
}
