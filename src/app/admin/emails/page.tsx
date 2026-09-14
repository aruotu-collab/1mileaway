import { prisma } from "@/lib/db";

export default async function AdminEmailsPage() {
  const emails = await prisma.emailMessage.findMany({ orderBy: { createdAt: "desc" }, take: 40 });
  return (
    <main>
      <h1 className="serif text-4xl">Emails</h1>
      <ul className="mt-6 grid gap-2">
        {emails.map((email) => (
          <li key={email.id} className="card p-4 text-sm">
            <p className="font-semibold">{email.subject}</p>
            <p className="text-ink-soft">
              {email.toEmail} · {email.template} · {email.status}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
