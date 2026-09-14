import { prisma } from "@/lib/db";

export default async function AdminCallsPage() {
  const calls = await prisma.call.findMany({
    include: { business: true, lead: true },
    orderBy: { startedAt: "desc" },
    take: 50,
  });
  return (
    <main>
      <h1 className="serif text-4xl">Calls</h1>
      <ul className="mt-6 grid gap-3">
        {calls.map((call) => (
          <li key={call.id} className="card p-4 text-sm">
            {call.business.name} · {call.status} · {call.durationSeconds}s · lead {call.lead?.status ?? "none"}
          </li>
        ))}
      </ul>
    </main>
  );
}
