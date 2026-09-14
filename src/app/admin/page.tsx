import { prisma } from "@/lib/db";

export default async function AdminOverviewPage() {
  const [professionals, leads, outstanding, emails, calls] = await Promise.all([
    prisma.business.count({ where: { deletedAt: null } }),
    prisma.lead.count({ where: { status: "QUALIFIED" } }),
    prisma.outstandingLeadBalance.count({ where: { status: "OPEN" } }),
    prisma.emailMessage.count(),
    prisma.call.count(),
  ]);

  const cards = [
    ["Professionals", professionals],
    ["Qualified leads", leads],
    ["Open balances", outstanding],
    ["Calls", calls],
    ["Emails", emails],
  ] as const;

  return (
    <main>
      <h1 className="serif text-4xl">Overview</h1>
      <p className="mt-2 text-ink-soft">Successful local connections are the product metric — not directory volume.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, value]) => (
          <div key={label} className="card p-5">
            <p className="text-sm text-ink-soft">{label}</p>
            <p className="serif mt-1 text-3xl">{value}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
