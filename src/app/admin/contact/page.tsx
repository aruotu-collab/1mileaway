import Link from "next/link";
import { prisma } from "@/lib/db";
import { AdminStat } from "@/components/admin-stat";
import { formatLocalDateTime } from "@/lib/utils";

export default async function AdminContactPage() {
  const [threads, openCount] = await Promise.all([
    prisma.contactThread.findMany({
      include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: 80,
    }),
    prisma.contactThread.count({ where: { status: "open" } }),
  ]);

  return (
    <main>
      <h1 className="serif text-4xl">Contact us</h1>
      <p className="mt-2 text-ink-soft">
        Messages from visitors and members. Reply by email from here — they do not need an account.
      </p>
      <div className="mt-6">
        <AdminStat label="Open" value={openCount} />
      </div>
      {threads.length === 0 ? (
        <p className="card mt-6 p-5 text-ink-soft">No contact messages yet.</p>
      ) : (
        <ul className="mt-6 grid gap-2">
          {threads.map((thread) => (
            <li key={thread.id} className="card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold">
                  <Link href={`/admin/contact/${thread.id}`} className="hover:underline">
                    {thread.subject}
                  </Link>
                </p>
                <p className="text-sm text-ink-soft">{formatLocalDateTime(thread.updatedAt)}</p>
              </div>
              <p className="mt-1 text-sm text-ink-soft">
                {thread.name} · {thread.email} · {thread.profileId ? "member" : "visitor"} · {thread.status}
              </p>
              {thread.messages[0] ? (
                <p className="mt-2 line-clamp-2 text-sm">{thread.messages[0].body}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
