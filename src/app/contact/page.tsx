import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { sendContactMessage } from "@/app/actions/contact";
import { SubmitButton } from "@/components/submit-button";
import { formatLocalDateTime } from "@/lib/utils";

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const query = await searchParams;
  const user = await getSession();
  const threads = user
    ? await prisma.contactThread.findMany({
        where: { OR: [{ profileId: user.id }, { email: user.email }] },
        include: { messages: { orderBy: { createdAt: "asc" } } },
        orderBy: { updatedAt: "desc" },
        take: 20,
      })
    : [];

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="serif text-4xl">Contact us</h1>
      <p className="mt-3 text-ink-soft">
        Visitors and professionals can write to us here. We reply by email. You do not need an account.
      </p>
      {query.sent ? <p className="card mt-4 p-4">Thanks. We have your message and will reply by email.</p> : null}
      {query.error === "rate" ? (
        <p className="mt-4 text-rust">Please wait a few minutes before sending another message.</p>
      ) : null}
      {query.error === "1" ? <p className="mt-4 text-rust">Please fill in your name, a real email, a subject, and a short message.</p> : null}

      <form action={sendContactMessage} className="card mt-6 grid gap-3 p-5">
        <label>
          <span className="mb-1 block text-sm font-medium">Name</span>
          <input
            className="w-full rounded-2xl border border-line bg-paper px-4 py-3"
            name="name"
            defaultValue={user?.name ?? ""}
            required
            maxLength={80}
          />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium">Email</span>
          <input
            className="w-full rounded-2xl border border-line bg-paper px-4 py-3"
            name="email"
            type="email"
            defaultValue={user?.email ?? ""}
            required
          />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium">Subject</span>
          <input className="w-full rounded-2xl border border-line bg-paper px-4 py-3" name="subject" required maxLength={120} />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium">Message</span>
          <textarea
            className="min-h-36 w-full rounded-2xl border border-line bg-paper px-4 py-3"
            name="body"
            required
            minLength={10}
            maxLength={5000}
          />
        </label>
        <SubmitButton pendingLabel="Sending…">Send message</SubmitButton>
      </form>

      {threads.length > 0 ? (
        <section className="mt-12">
          <h2 className="serif text-2xl">Your messages</h2>
          <ul className="mt-4 grid gap-3">
            {threads.map((thread) => (
              <li key={thread.id} className="card p-5">
                <p className="font-semibold">{thread.subject}</p>
                <p className="mt-1 text-sm text-ink-soft">
                  {thread.status === "open" ? "Open" : "Closed"} · last update {formatLocalDateTime(thread.updatedAt)}
                </p>
                <ol className="mt-3 grid gap-2 text-sm">
                  {thread.messages.map((message) => (
                    <li key={message.id}>
                      <span className="text-ink-soft">
                        {message.authorKind === "admin" ? "1mileaway" : "You"} · {formatLocalDateTime(message.createdAt)}
                      </span>
                      <p className="mt-1 whitespace-pre-wrap">{message.body}</p>
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
