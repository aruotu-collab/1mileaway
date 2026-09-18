import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { closeContactThread, replyToContact } from "@/app/actions/contact";
import { formatLocalDateTime } from "@/lib/utils";

export default async function AdminContactThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sent?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const thread = await prisma.contactThread.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!thread) notFound();

  return (
    <main>
      <p className="mb-4">
        <Link href="/admin/contact" className="text-sm font-medium text-moss-deep hover:underline">
          ← All messages
        </Link>
      </p>
      <h1 className="serif text-4xl">{thread.subject}</h1>
      <p className="mt-2 text-ink-soft">
        {thread.name} · {thread.email} · {thread.profileId ? "signed-in member" : "not a member"} · {thread.status}
      </p>
      {query.sent ? <p className="card mt-4 p-4">Reply sent to {thread.email}.</p> : null}

      <ol className="mt-6 grid gap-3">
        {thread.messages.map((message) => (
          <li key={message.id} className="card p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-ink-soft">
              {message.authorKind === "admin" ? "You" : thread.name} · {formatLocalDateTime(message.createdAt)}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm">{message.body}</p>
          </li>
        ))}
      </ol>

      <form action={replyToContact} className="card mt-6 grid gap-3 p-5">
        <input type="hidden" name="threadId" value={thread.id} />
        <label>
          <span className="mb-1 block text-sm font-medium">Reply by email</span>
          <textarea
            className="min-h-32 w-full rounded-2xl border border-line bg-paper px-4 py-3"
            name="body"
            required
            minLength={2}
            placeholder="This goes to their inbox, even if they have no account."
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <button className="btn btn-primary" type="submit">
            Send reply
          </button>
        </div>
      </form>

      {thread.status === "open" ? (
        <form action={closeContactThread} className="mt-4">
          <input type="hidden" name="threadId" value={thread.id} />
          <button className="btn btn-ghost" type="submit">
            Close
          </button>
        </form>
      ) : null}
    </main>
  );
}
