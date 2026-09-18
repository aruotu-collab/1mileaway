import { prisma } from "@/lib/db";
import { formatLocalDateTime } from "@/lib/utils";

export default async function AdminEmailsPage() {
  const emails = await prisma.emailMessage.findMany({
    include: { business: true },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  return (
    <main>
      <h1 className="serif text-4xl">Emails</h1>
      <p className="mt-2 text-ink-soft">Claim invites, trial mail, call notices, and magic links actually sent or mocked.</p>
      {emails.length === 0 ? (
        <p className="card mt-6 p-5 text-ink-soft">No emails yet.</p>
      ) : (
        <ul className="mt-6 grid gap-2">
          {emails.map((email) => (
            <li key={email.id} className="card p-4 text-sm">
              <p className="font-semibold">{email.subject}</p>
              <p className="mt-1 text-ink-soft">
                {email.toEmail} · {email.template} · {email.status} · {formatLocalDateTime(email.createdAt)}
                {email.business ? ` · ${email.business.name}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
