import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/utils";

export default async function AdminPaymentsPage() {
  const [balances, payments] = await Promise.all([
    prisma.outstandingLeadBalance.findMany({ include: { business: true }, orderBy: { createdAt: "desc" } }),
    prisma.payment.findMany({ include: { business: true }, orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <main>
      <h1 className="serif text-4xl">Payments</h1>
      <h2 className="serif mt-6 text-2xl">Balances</h2>
      <ul className="mt-3 grid gap-2">
        {balances.map((row) => (
          <li key={row.id} className="card p-4 text-sm">
            {row.business.name} · {row.status} · {formatMoney(row.amountMinor, row.currency)}
          </li>
        ))}
      </ul>
      <h2 className="serif mt-8 text-2xl">Payments</h2>
      <ul className="mt-3 grid gap-2">
        {payments.map((row) => (
          <li key={row.id} className="card p-4 text-sm">
            {row.business.name} · {row.provider} · {row.status} · {formatMoney(row.amountMinor, row.currency)}
          </li>
        ))}
      </ul>
    </main>
  );
}
