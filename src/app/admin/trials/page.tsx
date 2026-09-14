import { prisma } from "@/lib/db";

export default async function AdminTrialsPage() {
  const [configs, balances] = await Promise.all([
    prisma.trialConfig.findMany(),
    prisma.trialBalance.findMany({ include: { business: true } }),
  ]);
  return (
    <main>
      <h1 className="serif text-4xl">Trials</h1>
      <ul className="mt-6 grid gap-2">
        {configs.map((config) => (
          <li key={config.id} className="card p-4 text-sm">
            {config.scope}: {config.freeLeads} free qualified leads
          </li>
        ))}
      </ul>
      <ul className="mt-6 grid gap-2">
        {balances.map((row) => (
          <li key={row.id} className="card p-4 text-sm">
            {row.business.name}: {row.remaining} remaining / {row.used} used
          </li>
        ))}
      </ul>
    </main>
  );
}
